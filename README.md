# Project Setup Guide

Local development setup for the React + Vite frontend, Python backend, and Supabase edge functions.   This project supports local and deployed runtimes (note that for deployment, backend will likely need to run in a Docker Container accessible to the frontend).  IMPORTANT: this project was developed for usability first and without consideration of security due to its scope and timeline and should not be used for live customer data.

---

## 1. Slack App Configuration

### OAuth & Permissions

Add these bot token scopes:

- `channels:history`
- `channels:join`
- `channels:read`
- `chat:write`
- `groups:history`
- `groups:read`
- `users:read`

### Event Subscriptions

Set the **Request URL** to:

```
https://<your-ngrok-domain>/functions/v1/slack-webhook
```

Under **Subscribe to bot events**, add:

- `message.channels`

### Install App

Install the app to your workspace from this tab.

### Add Bot to Channels

Once installed, invite the bot to any channels it should monitor.

---

## 2. Supabase

From the project root:

```bash
supabase start
supabase db reset
```

---

## 3. Frontend

Create `frontend/.env.local` and set the following values.  Note that this general PUBLISHABLE_KEY should work for local supabase instances, and be sure confirm the ports for the local URL and API URL:

```env
VITE_SUPABASE_ENV=local
VITE_SUPABASE_LOCAL_URL=http://localhost:54321
VITE_SUPABASE_LOCAL_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_API_URL=http://localhost:8000
```

Then run:

```bash
pnpm install
pnpm dev
```

---

## 4. Supabase Edge Functions

Create `supabase/functions/.env`, populate SLACK_SIGNING_SECRET and SLACK_BOT_TOKEN with your Slack API values (Slack app can be created on api.slack.com):

```env
SLACK_SIGNING_SECRET=b5373XXXXXXXXXXXXXXc77
SLACK_BOT_TOKEN=xoxb-997XXXXXX1-999XXXXXX0337-wZ5XXXXXXXXXXXT30KA

# Backend URL for message processing
# Uses host.docker.internal to reach host machine from Docker on macOS (check values for other operating systems)
BACKEND_URL=http://host.docker.internal:8000
```

Start the edge functions:

```bash
supabase functions serve
```

To expose locally for Slack webhooks:

```bash
ngrok http 54321
```

Use the ngrok URL for the Slack Event Subscriptions Request URL (see section 1).

---

## 5. Backend

Create `backend/.env` *(optional — defaults to local model)*:

```env
SUPABASE_ENV=local
OPENAI_API_KEY=your-key-here
```

Then run:

```bash
sh ./run_api.sh
```

> **Note:** `OPENAI_API_KEY` is only required if using OpenAI for filtering.
