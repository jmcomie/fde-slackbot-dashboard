# Local Development with Supabase - Complete Guide

This guide explains how to develop locally with Supabase and switch between local and production environments seamlessly.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Switching Patterns](#environment-switching-patterns)
- [config.toml Explanation](#configtoml-explanation)
- [Testing Features](#testing-features)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### 1. Install Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows (scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (all platforms)
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### 2. Install Docker Desktop

Supabase local development requires Docker to run PostgreSQL, Auth, Realtime, and other services.

Download from: https://www.docker.com/products/docker-desktop

### 3. Link to Production Project (Optional but Recommended)

```bash
# Login to Supabase
supabase login

# Link to your production project
cd /path/to/nixo-fde-slackbot-dashboard
supabase link --project-ref your-project-id

# Pull schema from production (optional)
supabase db pull
```

## 🚀 Quick Start

### Step 1: Start Local Supabase

```bash
# From project root
cd nixo-fde-slackbot-dashboard

# Start all Supabase services
supabase start
```

**First time?** This will download Docker images (~2-3 GB). Subsequent starts are much faster.

**Output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
 publishable key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
      secret key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important URLs:**
- **API**: `http://localhost:54321` - Your Supabase API endpoint
- **Studio**: `http://localhost:54323` - Database UI (like production dashboard)
- **Inbucket**: `http://localhost:54324` - Email testing (catch all emails)

### Step 2: Configure Frontend for Local Development

**Create `frontend/.env.local`:**
```bash
cd frontend
cp .env.local.example .env.local
```

**Edit `frontend/.env.local`:**
```bash
# Set to 'local' for local development
VITE_SUPABASE_ENV=local

# Production credentials (keep these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-publishable-key

# Local credentials (using defaults from supabase start)
VITE_SUPABASE_LOCAL_URL=http://localhost:54321
VITE_SUPABASE_LOCAL_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

**Start frontend:**
```bash
pnpm dev
```

You should see in the console:
```
[Supabase] Using LOCAL environment
[Supabase] URL: http://localhost:54321
```

### Step 3: Configure Backend for Local Development

**Create `backend/.env`:**
```bash
cd ../backend
cp .env.example .env
```

**Edit `backend/.env`:**
```bash
# Set to 'local' for local development
SUPABASE_ENV=local

# Production credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-production-publishable-key
SUPABASE_SECRET_KEY=your-production-secret-key

# Local uses defaults from code (no need to set these)
```

**Install dependencies with uv:**
```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
```

**Test the connection:**
```bash
python -m lib.supabase_client
```

Expected output:
```
[Supabase] Using LOCAL environment: http://localhost:54321
Environment: local
URL: http://localhost:54321
Testing connection...
✅ Connection successful!
```

## 🔄 Environment Switching Patterns

### Pattern 1: Environment Variable Toggle (Recommended)

**Frontend (`frontend/.env.local`):**
```bash
# For local development
VITE_SUPABASE_ENV=local

# For production testing
VITE_SUPABASE_ENV=production
```

**Backend (`backend/.env`):**
```bash
# For local development
SUPABASE_ENV=local

# For production testing
SUPABASE_ENV=production
```

**Switch environments:**
1. Change `VITE_SUPABASE_ENV` or `SUPABASE_ENV`
2. Restart your dev server
3. That's it!

### Pattern 2: Multiple .env Files

**Create environment-specific files:**
```bash
frontend/
├── .env.local          # Local development
├── .env.production     # Production
└── .env.staging        # Staging (optional)
```

**Load the appropriate file:**
```bash
# Use .env.local
pnpm dev

# Use .env.production
pnpm build
```

### Pattern 3: Command-line Override

**Frontend:**
```bash
# Force local
VITE_SUPABASE_ENV=local pnpm dev

# Force production
VITE_SUPABASE_ENV=production pnpm dev
```

**Backend:**
```bash
# Force local
SUPABASE_ENV=local python app.py

# Force production
SUPABASE_ENV=production python app.py
```

## ⚙️ config.toml Explanation

The `supabase/config.toml` file configures your **local** Supabase instance. Here's what each section does:

### Essential Sections for Your Use Case

#### 1. **API Configuration**
```toml
[api]
enabled = true
port = 54321        # Your local API endpoint
schemas = ["public", "storage", "graphql_public"]
max_rows = 1000     # Prevent accidental huge queries
```

**Purpose:** HTTP-based database access via PostgREST
**Test:** `curl http://localhost:54321/rest/v1/messages`

#### 2. **Database Configuration**
```toml
[db]
port = 54322                  # Direct PostgreSQL connection
shadow_port = 54320          # For migrations
major_version = 15           # Match your production version!
```

**Purpose:** Direct database access for SQL queries
**Test:** `psql postgresql://postgres:postgres@localhost:54322/postgres`

#### 3. **Realtime Configuration**
```toml
[realtime]
enabled = true
```

**Purpose:** WebSocket-based realtime subscriptions
**Test:** See [Testing Realtime](#testing-realtime) below

#### 4. **Edge Functions Configuration**
```toml
[edge_runtime]
enabled = true
policy = "oneshot"    # Hot reload on file changes!

[functions.slack-webhook]
verify_jwt = false    # Slack webhooks don't send JWTs
```

**Purpose:** Run Deno edge functions locally
**Test:** See [Testing Edge Functions](#testing-edge-functions) below

#### 5. **Auth Configuration**
```toml
[auth]
enabled = true
site_url = "http://localhost:5173"    # Your frontend URL
enable_signup = true
```

**Purpose:** Authentication and user management
**Test:** Sign up a user via frontend

#### 6. **Inbucket (Email Testing)**
```toml
[inbucket]
enabled = true
port = 54324
```

**Purpose:** Catch all emails sent locally
**Access:** http://localhost:54324
**Test:** Trigger a password reset, check Inbucket

## 🧪 Testing Features

### Testing HTTP-Based Database Access

**1. Using the Frontend:**
```typescript
import { supabase } from '@/lib/supabase'

// Insert a message
const { data, error } = await supabase
  .from('messages')
  .insert({
    user_id: 'user123',
    user_name: 'Test User',
    content: 'Hello from local!',
    channel: 'general',
    message_ts: new Date().toISOString()
  })
```

**2. Using the Backend:**
```python
from lib.supabase_client import supabase

# Insert a message
result = supabase.table('messages').insert({
    'user_id': 'user123',
    'user_name': 'Test User',
    'content': 'Hello from Python!',
    'channel': 'general',
    'message_ts': datetime.utcnow().isoformat()
}).execute()
```

**3. Using cURL:**
```bash
curl -X POST http://localhost:54321/rest/v1/messages \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "user_name": "Test User",
    "content": "Hello from cURL!",
    "channel": "general",
    "message_ts": "2024-01-01T00:00:00Z"
  }'
```

### Testing Edge Functions

**1. Create a test function:**
```bash
supabase functions new hello
```

**2. Serve it locally:**
```bash
supabase functions serve hello
```

**3. Test it:**
```bash
curl -i http://localhost:54321/functions/v1/hello \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**4. For Slack webhook (no JWT):**
```bash
curl -i http://localhost:54321/functions/v1/slack-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event":{"text":"test"}}'
```

### Testing Realtime

**1. Subscribe to changes in frontend:**
```typescript
import { supabase } from '@/lib/supabase'

const channel = supabase
  .channel('messages-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    console.log('New message:', payload.new)
  })
  .subscribe()
```

**2. Insert a message (different tab/terminal):**
```bash
curl -X POST http://localhost:54321/rest/v1/messages \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","content":"Realtime test!",...}'
```

**3. Check console:** You should see the new message logged immediately!

## 📊 Useful Commands

### Supabase CLI Commands

```bash
# Start all services
supabase start

# Stop all services
supabase stop

# Restart services (after config changes)
supabase stop && supabase start

# View service status
supabase status

# View logs
supabase logs

# Reset database (⚠️ destroys all data!)
supabase db reset

# Create a migration
supabase migration new create_messages_table

# Apply migrations
supabase db push

# Pull schema from production
supabase db pull
```

### Edge Function Commands

```bash
# Create a new function
supabase functions new my-function

# Serve all functions locally
supabase functions serve

# Serve specific function
supabase functions serve hello

# Deploy to production
supabase functions deploy slack-webhook

# View function logs
supabase functions logs slack-webhook
```

## 🔍 Troubleshooting

### Issue: "Connection refused" to localhost:54321

**Solution:**
```bash
# Check if Supabase is running
supabase status

# If not running, start it
supabase start

# If still failing, check Docker
docker ps
```

### Issue: Frontend still using production

**Solution:**
1. Check `frontend/.env.local` has `VITE_SUPABASE_ENV=local`
2. Restart dev server (`Ctrl+C`, then `pnpm dev`)
3. Check browser console for `[Supabase] Using LOCAL environment`

### Issue: "relation does not exist" errors

**Solution:**
```bash
# You haven't created tables yet!
# Option 1: Apply migrations
supabase db push

# Option 2: Create tables in Studio
# Open http://localhost:54323
# Go to Table Editor → New Table

# Option 3: Pull from production
supabase db pull
supabase db push
```

### Issue: Edge function not responding

**Solution:**
```bash
# Make sure edge runtime is enabled in config.toml
grep "edge_runtime" supabase/config.toml

# Restart Supabase
supabase stop
supabase start

# Check function logs
supabase functions logs slack-webhook --tail
```

### Issue: Realtime not working

**Solution:**
1. Check `[realtime] enabled = true` in config.toml
2. Restart Supabase: `supabase stop && supabase start`
3. Check WebSocket connection in browser dev tools
4. Verify subscription code is correct

### Issue: "Invalid API key" errors

**Solution:**
```bash
# Get your local keys
supabase status

# Copy the 'publishable key' to your .env files
# Frontend: VITE_SUPABASE_LOCAL_PUBLISHABLE_KEY
# Backend: SUPABASE_LOCAL_PUBLISHABLE_KEY (or use default)
```

## 📚 Official Documentation

- [Local Development Overview](https://supabase.com/docs/guides/local-development/overview)
- [Managing Config and Secrets](https://supabase.com/docs/guides/local-development/managing-config)
- [Supabase CLI Config Reference](https://supabase.com/docs/guides/local-development/cli/config)
- [Edge Functions Quickstart](https://supabase.com/docs/guides/functions/quickstart)
- [Development Environment](https://supabase.com/docs/guides/functions/development-environment)

## 🎯 Production Deployment Workflow

### 1. Develop Locally
```bash
VITE_SUPABASE_ENV=local pnpm dev
```

### 2. Test Migrations
```bash
# Create migration
supabase migration new my_feature

# Test locally
supabase db reset
supabase db push
```

### 3. Deploy Migrations to Production
```bash
# Push to production
supabase db push --linked

# Or via Dashboard:
# Dashboard → Database → Migrations → Deploy
```

### 4. Deploy Edge Functions
```bash
# Deploy function
supabase functions deploy slack-webhook

# Set production secrets
supabase secrets set OPENAI_API_KEY=prod-key
supabase secrets set SLACK_SIGNING_SECRET=prod-secret
```

### 5. Deploy Frontend
```bash
# Build with production env
VITE_SUPABASE_ENV=production pnpm build

# Deploy to Vercel/Netlify/etc
pnpm deploy
```

### 6. Deploy Backend
```bash
# Set production env vars on your server
export SUPABASE_ENV=production
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SECRET_KEY=prod-secret-key

# Deploy via your preferred method
```

---

**You're all set! 🎉**

Start with `supabase start`, set `VITE_SUPABASE_ENV=local`, and you're ready to develop with full local Supabase capabilities including database access, edge functions, and realtime!
