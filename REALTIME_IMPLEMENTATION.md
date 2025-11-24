# Realtime Implementation Guide

## Overview

The FDE Slackbot now has complete end-to-end realtime updates from Slack messages to the frontend dashboard.

## Architecture

```
┌─────────────┐
│   Slack     │
│   Events    │
└──────┬──────┘
       │
       │ POST webhook
       ▼
┌────────────────────────────────────┐
│  Supabase Edge Function            │
│  (slack-webhook)                   │
│                                    │
│  1. Insert to slack_events         │
│  2. Call Python backend            │
└────────┬───────────────────────────┘
         │
         │ POST /process {message_id}
         ▼
┌────────────────────────────────────┐
│  Python FastAPI Backend            │
│  (localhost:8000)                  │
│                                    │
│  1. Fetch message from DB          │
│  2. Classify with ML model         │
│  3. Group into concern             │
│  4. UPDATE concern table ──────────┼──┐
│  5. INSERT concern_group ──────────┼──┤
└────────────────────────────────────┘  │
                                        │
         ┌──────────────────────────────┘
         │
         │ Postgres NOTIFY
         ▼
┌────────────────────────────────────┐
│  Supabase Realtime Server          │
│  (Listening to publication)        │
│                                    │
│  Broadcasts changes to:            │
│  - concern                         │
│  - concern_group                   │
│  - slack_events                    │
└────────┬───────────────────────────┘
         │
         │ WebSocket broadcast
         ▼
┌────────────────────────────────────┐
│  Frontend (React)                  │
│  useConcerns() hook                │
│                                    │
│  - Subscribes to postgres_changes  │
│  - Receives INSERT/UPDATE events   │
│  - Updates UI automatically        │
└────────────────────────────────────┘
```

## Key Configuration

### 1. Database Realtime Publication

**Migration**: `supabase/migrations/20251123000006_enable_realtime_for_concern_tables.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE concern;
ALTER PUBLICATION supabase_realtime ADD TABLE concern_group;
```

**Verify**:
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
```

Should show:
- `concern` ✅
- `concern_group` ✅
- `slack_events` ✅

### 2. Frontend Subscription

**File**: `frontend/src/hooks/useConcerns.ts` (lines 49-84)

```typescript
const channel = supabase
  .channel('concerns_changes')
  .on(
    'postgres_changes',
    {
      event: '*',           // Listen to INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'concern',
    },
    (payload) => {
      console.log('Concern change received:', payload)
      // Handle INSERT, UPDATE, DELETE events
    }
  )
  .subscribe()
```

### 3. Backend Database Operations

**File**: `backend/src/fde_slackbot/grouping/db.py`

Uses `get_supabase_client(use_secret_key=True)` to bypass RLS when creating/updating concerns:

```python
# Create concern (lines 22-49)
supabase = get_supabase_client(use_secret_key=True)
response = supabase.table('concern').insert(data).execute()

# Update concern (lines 118-138)
supabase = get_supabase_client(use_secret_key=True)
supabase.table('concern').update({...}).eq('id', concern_id).execute()
```

**Critical**: Service role key bypasses RLS but still triggers realtime broadcasts ✅

### 4. Edge Function Integration

**File**: `supabase/functions/slack-webhook/index.ts`

```typescript
// Step 1: Insert to slack_events
const { data: insertedEvent } = await supabase
  .from('slack_events')
  .insert({...})
  .select()
  .single()

// Step 2: Call Python backend
await fetch(`${backendUrl}/process`, {
  method: 'POST',
  body: JSON.stringify({ message_id: insertedEvent.id }),
})
```

## Testing Realtime

### Prerequisites

1. **Start Supabase**:
   ```bash
   supabase start
   ```

2. **Start Python API**:
   ```bash
   cd backend
   ./run_api.sh
   ```

3. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### Manual Test

1. **Open Browser**: http://localhost:5173/concerns

2. **Open Browser Console**: Watch for "Concern change received:" logs

3. **Simulate Slack Webhook**:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/slack-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "token": "test",
       "team_id": "T123",
       "type": "event_callback",
       "event": {
         "type": "message",
         "user": "U123",
         "text": "The login button is broken!",
         "ts": "1234567890.123456",
         "channel": "C123"
       }
     }'
   ```

4. **Expected Result**:
   - Console shows: "Concern change received: { eventType: 'INSERT', ... }"
   - New concern appears in UI within 1-2 seconds
   - NO page refresh needed

### Automated Test

```bash
./test_end_to_end.sh
```

This script:
- ✅ Checks prerequisites (API, Supabase running)
- ✅ Verifies realtime is enabled
- ✅ Simulates Slack webhook
- ✅ Verifies message → concern flow
- ✅ Confirms realtime configuration

## Troubleshooting

### Concern not appearing in frontend?

1. **Check realtime subscription**:
   - Open browser console
   - Look for: `"Concern change received:"`
   - If missing, subscription not working

2. **Verify publication**:
   ```bash
   PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \
     -c "SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';"
   ```
   Should include `concern` table.

3. **Check backend logs**:
   - Python API should log: `"Grouped message ... concern_id=..."`
   - If missing, grouping failed (check classification)

4. **Verify concern was created**:
   ```bash
   PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \
     -c "SELECT * FROM concern ORDER BY created_at DESC LIMIT 5;"
   ```

### Frontend subscription not connecting?

1. **Check Supabase client**:
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`
   - Should match `supabase status` output

2. **Check browser network tab**:
   - Look for WebSocket connection to `ws://localhost:54321/realtime/v1/websocket`
   - Should show status: "Connected"

3. **Test with direct query**:
   ```typescript
   // In browser console
   const { data } = await supabase.from('concern').select('*')
   console.log(data)  // Should return concerns
   ```

### Backend not updating database?

1. **Check service role key**:
   - Verify `SUPABASE_SECRET_KEY` in `backend/.env`
   - Should match `supabase status` output (service_role key)

2. **Check RLS policies**:
   ```bash
   PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres \
     -c "SELECT * FROM pg_policies WHERE tablename IN ('concern', 'concern_group');"
   ```

3. **Test direct insert**:
   ```bash
   cd backend
   uv run python -c "
   from fde_slackbot.grouping.db import create_concern
   from fde_slackbot.grouping.models import ConcernCreate
   concern = ConcernCreate(
     category='bug_report',
     centroid_embedding=[0.1]*384,
     title='Test Concern',
     grouping_method='manual'
   )
   concern_id = create_concern(concern)
   print(f'Created: {concern_id}')
   "
   ```

## Performance

- **Latency**: < 2 seconds from Slack message to frontend update
- **Scalability**: Realtime handles ~1000 concurrent connections
- **Reliability**: Missed updates can be caught on page refresh (query falls back to direct fetch)

## Security Considerations

### Current State (Local Dev)
- ✅ RLS enabled on all tables
- ✅ Backend uses service role (bypasses RLS for writes)
- ✅ Frontend uses anon key (subject to RLS for reads)
- ⚠️ No authentication on Python API (localhost only)

### Production Recommendations
1. **Add API authentication**: JWT validation on Python endpoints
2. **Validate Slack signatures**: Verify webhook requests are from Slack
3. **Rate limiting**: Protect against abuse
4. **Environment-based keys**: Use separate keys for prod/staging/dev
5. **Network restrictions**: Backend should only be accessible from edge functions

## Next Steps

1. **Deploy Python backend**: Railway, Fly.io, or Cloud Run
2. **Update `BACKEND_URL`**: Point edge function to production backend
3. **Add monitoring**: Track message processing latency
4. **Implement retries**: Handle backend failures gracefully
5. **Add message deduplication**: Prevent processing same message twice
