# Environment Switching Quick Reference

## 🔄 Switch Between Local & Production

### Frontend

**File:** `frontend/.env.local`

```bash
# Local Development (with `supabase start`)
VITE_SUPABASE_ENV=local

# Production
VITE_SUPABASE_ENV=production
```

Then restart: `pnpm dev`

### Backend

**File:** `backend/.env`

```bash
# Local Development (with `supabase start`)
SUPABASE_ENV=local

# Production
SUPABASE_ENV=production
```

Then restart your Python app

### Edge Functions

**File:** `supabase/functions/.env`

Automatically uses local when running:
```bash
supabase functions serve
```

For production, deploy with:
```bash
supabase functions deploy
```

## 📍 Local URLs

After running `supabase start`:

| Service | URL | Purpose |
|---------|-----|---------|
| API | http://localhost:54321 | Database REST API |
| Studio | http://localhost:54323 | Database UI |
| Inbucket | http://localhost:54324 | Email testing |
| DB Direct | postgresql://postgres:postgres@localhost:54322/postgres | PostgreSQL |

## 🔑 Default Local Keys

**Publishable Key** (public, safe to hardcode):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**Secret Key** (secret, admin access):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

These are defaults from Supabase CLI - only work on localhost!

## ⚡ Common Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Check status
supabase status

# Reset database (⚠️ destroys data!)
supabase db reset

# Serve edge functions with hot reload
supabase functions serve

# View logs
supabase logs
```

## 🧪 Test It's Working

### Frontend
Open browser console, should see:
```
[Supabase] Using LOCAL environment
[Supabase] URL: http://localhost:54321
```

### Backend
Run test script:
```bash
cd backend
python -m lib.supabase_client
```

Should see:
```
[Supabase] Using LOCAL environment: http://localhost:54321
✅ Connection successful!
```

## 🎯 Typical Workflow

1. **Start local Supabase:**
   ```bash
   supabase start
   ```

2. **Set frontend to local:**
   ```bash
   # frontend/.env.local
   VITE_SUPABASE_ENV=local
   ```

3. **Set backend to local:**
   ```bash
   # backend/.env
   SUPABASE_ENV=local
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1: Frontend
   cd frontend && pnpm dev

   # Terminal 2: Backend
   cd backend && python app.py

   # Terminal 3: Edge functions (if needed)
   supabase functions serve
   ```

5. **Develop & test locally** with full database, realtime, and edge functions!

6. **When ready for production:**
   - Change `VITE_SUPABASE_ENV=production`
   - Change `SUPABASE_ENV=production`
   - Restart servers
   - Deploy!

## 📦 What's Configured

The `supabase/config.toml` enables:

- ✅ **HTTP Database Access** (PostgREST API) on port 54321
- ✅ **Realtime** (WebSocket subscriptions)
- ✅ **Edge Functions** (Deno runtime with hot reload)
- ✅ **Auth** (user authentication)
- ✅ **Storage** (file uploads, up to 50MB)
- ✅ **Studio** (database UI)
- ✅ **Inbucket** (email testing)

All configured for your FDE Slackbot use case!
