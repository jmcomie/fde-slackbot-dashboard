# FDE Slackbot API

Simple FastAPI server for processing Slack messages through the classification and grouping pipeline.

## Quick Start

```bash
# From the backend directory
./run_api.sh
```

Or manually:

```bash
cd backend
uv run uvicorn fde_slackbot.api.main:app --reload --port 8000
```

## API Endpoints

### `GET /`
Health check endpoint.

**Response:**
```json
{
  "service": "FDE Slackbot API",
  "status": "running",
  "version": "0.1.0"
}
```

### `GET /health`
Detailed health check.

**Response:**
```json
{
  "status": "healthy",
  "classifier": "initialized",
  "grouper": "initialized"
}
```

### `POST /process`
Process a Slack message through the classification and grouping pipeline.

**Request Body:**
```json
{
  "message_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Relevant Message):**
```json
{
  "success": true,
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "category": "bug_report",
  "confidence": 0.89,
  "is_relevant": true,
  "concern_id": "123e4567-e89b-12d3-a456-426614174000",
  "grouping_method": "cosine_high_conf",
  "similarity_score": 0.87,
  "is_new_concern": false
}
```

**Response (Irrelevant Message):**
```json
{
  "success": true,
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "category": "irrelevant",
  "confidence": 0.95,
  "is_relevant": false
}
```

## Architecture

```
Edge Function (slack-webhook)
  ↓
  1. Insert to slack_events table
  ↓
  2. Call POST /process with message_id
  ↓
Python Backend
  ↓
  3. Fetch message from slack_events
  ↓
  4. Classify with MessageClassifier
  ↓
  5. If relevant, group with ConcernGrouper
  ↓
  6. Update concern and concern_group tables
```

## Environment Variables

See `.env.example` for required configuration:
- `SUPABASE_ENV`: 'local' or 'production'
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SECRET_KEY`: Service role key

## Testing

```bash
# Start the server
./run_api.sh

# In another terminal, test with curl
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{"message_id": "your-message-uuid-here"}'
```

## Database Updates

The `/process` endpoint updates the following tables:
- ✅ `concern` - Creates new or updates existing concern (centroid, message count)
- ✅ `concern_group` - Creates mapping from message to concern
- ❌ `slack_events` - NOT modified (remains immutable event log)

## Integration with Edge Functions

The `slack-webhook` edge function should call this endpoint after inserting a message:

```typescript
// After inserting to slack_events
const messageId = insertedMessage.id

// Call Python backend
await fetch('http://localhost:8000/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message_id: messageId })
})
```
