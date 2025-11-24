# Environment Variables Setup Guide

## Overview

This project uses multiple `.env` files for different components. Here's where each file should be located and what it contains.

## 📁 File Locations

```
nixo-fde-slackbot-dashboard/
├── frontend/
│   ├── .env.local              ← Frontend config (ALREADY EXISTS - edit with your credentials)
│   ├── .env.local.example      ← Template with env switching (recommended)
│   └── .env.example            ← Basic template
│
├── backend/
│   ├── .env                    ← Backend config (ALREADY EXISTS - edit with your credentials)
│   └── .env.example            ← Template
│
└── supabase/
    └── functions/
        ├── .env                ← Edge function config (ALREADY EXISTS - edit with your credentials)
        └── .env.example        ← Template
```

**Note:** Root-level `.env` files have been removed to eliminate confusion. Each component now has its own `.env` file in its respective directory.

## 🔧 Setup Instructions

### Step 1: Frontend Environment Variables

**Location:** `frontend/.env.local`

**The file already exists!** Just edit it with your credentials:

```bash
cd frontend
# Edit .env.local with your favorite editor
nano .env.local  # or vim, code, etc.
```

**Update `frontend/.env.local`:**
```bash
# Environment mode: 'local' or 'production'
VITE_SUPABASE_ENV=production

# Production Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here

# Local configuration (defaults work for `supabase start`)
VITE_SUPABASE_LOCAL_URL=http://localhost:54321
VITE_SUPABASE_LOCAL_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get these values:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **publishable** key → `VITE_SUPABASE_PUBLISHABLE_KEY`

**Important:**
- ✅ Use `VITE_` prefix (required by Vite)
- ✅ These are **public** keys (safe for frontend)
- ⚠️ Never commit `.env.local` to git (already in `.gitignore`)

### Step 2: Backend Environment Variables

**Location:** `backend/.env`

**The file already exists!** Just edit it with your credentials:

```bash
cd backend
# Edit .env with your favorite editor
nano .env  # or vim, code, etc.
```

**Update `backend/.env` with your credentials** (see template for all available options)

### Step 3: Edge Function Environment Variables

**Location:** `supabase/functions/.env`

**The file already exists!** Just edit it with your credentials:

```bash
cd supabase/functions
# Edit .env with your favorite editor
nano .env  # or vim, code, etc.
```

**Update `supabase/functions/.env`:**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key-here

# Slack Configuration
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

**Where to get these values:**

**Supabase Credentials:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **secret** key → `SUPABASE_SECRET_KEY` ⚠️ **Keep this secret!**

**OpenAI API Key:**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy it to `OPENAI_API_KEY`

**Slack Credentials:**
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your app
3. Go to **Basic Information** → Copy **Signing Secret** → `SLACK_SIGNING_SECRET`
4. Go to **OAuth & Permissions** → Copy **Bot User OAuth Token** → `SLACK_BOT_TOKEN`

**Important:**
- ⚠️ These are **SECRET** keys (server-side only)
- ⚠️ Never commit `supabase/functions/.env` to git (already in `.gitignore`)
- ✅ This file is automatically loaded by `supabase start`

## 🔐 Security Best Practices

### DO ✅
- ✅ Keep `.env.local` and `.env` files in `.gitignore`
- ✅ Use `.env.example` files as templates (commit these)
- ✅ Use different keys for development and production
- ✅ Rotate keys if they're ever exposed
- ✅ Use `VITE_` prefix for frontend env vars
- ✅ Store production secrets in Supabase Dashboard

### DON'T ❌
- ❌ Never commit actual `.env` files to git
- ❌ Never share your `secret` key publicly
- ❌ Never use production keys in development
- ❌ Never hardcode secrets in your code
- ❌ Never put secrets in frontend code without `VITE_` prefix

## 🚀 Using Environment Variables

### In Frontend (React/Vite)

```typescript
// Access in your React code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Already configured in src/lib/supabase.ts
import { supabase } from '@/lib/supabase'
```

### In Edge Functions (Deno)

```typescript
// Access in your edge functions
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKey = Deno.env.get('SUPABASE_SECRET_KEY')!
const openAIKey = Deno.env.get('OPENAI_API_KEY')!

// Example in slack-webhook/index.ts
const supabase = createClient(supabaseUrl, secretKey)
```

## 🌍 Production Deployment

### Frontend (Vercel/Netlify)

Add environment variables in your hosting provider's dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Edge Functions (Supabase)

Set production secrets using the CLI:

```bash
# Set individual secrets
supabase secrets set OPENAI_API_KEY=your-production-key
supabase secrets set SLACK_SIGNING_SECRET=your-production-secret

# Or set all secrets from your .env file
cd supabase/functions
supabase secrets set --env-file .env
```

Or via Supabase Dashboard:
1. Go to **Edge Functions** → **Your Function**
2. Click **Settings**
3. Add environment variables

## 📝 Quick Reference

| Environment Variable | Location | Public/Secret | Used By |
|---------------------|----------|---------------|---------|
| `VITE_SUPABASE_URL` | `frontend/.env.local` | Public | React Frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env.local` | Public | React Frontend |
| `SUPABASE_URL` | `supabase/functions/.env` | Public | Edge Functions |
| `SUPABASE_SECRET_KEY` | `supabase/functions/.env` | **SECRET** | Edge Functions |
| `OPENAI_API_KEY` | `supabase/functions/.env` | **SECRET** | Edge Functions |
| `SLACK_SIGNING_SECRET` | `supabase/functions/.env` | **SECRET** | Edge Functions |
| `SLACK_BOT_TOKEN` | `supabase/functions/.env` | **SECRET** | Edge Functions |

## 🆘 Troubleshooting

### Frontend can't access env vars
- ✅ Make sure they have the `VITE_` prefix
- ✅ Restart the dev server after changing `.env.local`
- ✅ Check the file is named `.env.local` not `.env`

### Edge functions can't access env vars
- ✅ Make sure the file is at `supabase/functions/.env`
- ✅ Run `supabase start` to load the variables
- ✅ Check the file is named `.env` not `.env.local`

### Production env vars not working
- ✅ Use `supabase secrets set` for edge functions
- ✅ Add vars to your hosting provider dashboard for frontend
- ✅ Redeploy after setting new secrets

## 📚 Official Documentation

- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Managing Config and Secrets](https://supabase.com/docs/guides/local-development/managing-config)
- [Development Environment](https://supabase.com/docs/guides/functions/development-environment)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Remember:** The `.env.example` files are templates. Copy them to `.env` or `.env.local` and fill in your actual values!
