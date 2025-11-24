# FDE Slackbot Dashboard - Technical Write-Up

## Architecture

**Core split:** Supabase (database + realtime) + Python FastAPI (ML workloads) + React frontend.

**Extensibility:** The data model supports horizontal extension beyond message grouping. Concerns can aggregate different entity types—Slack messages today, but the same grouping infrastructure could incorporate filed bugs, support tickets, or GitHub issues. This polymorphic design means adding a new source is a matter of writing an ingestion adapter, not rearchitecting the grouping logic.

**Why the split:** Supabase Edge Functions are great for lightweight ingestion and routing, but constrained for ML experimentation—limited runtime, no persistent processes, restricted library support. A separate Python backend allows loading arbitrary models, swapping classification strategies, and iterating on grouping algorithms without Edge Function deployment friction.

**Production evolution:** For high volume, I'd move storage to DynamoDB + Lambda with SQS for queuing, keeping Supabase as the realtime layer for its developer ergonomics.

---

## Realtime Flow
```
Slack Events → ngrok → Supabase Edge Function (slack-webhook)
  → INSERT to slack_events table
  → Fire-and-forget call to process-slack-event Edge Function
    → Python FastAPI backend (localhost:8000)
      → Classify message (regex pre-filter + embeddings or LLM)
      → Group into concern using hierarchical algorithm
      → UPDATE/INSERT to concern & concern_group tables
        → Postgres NOTIFY → Supabase Realtime
          → WebSocket → React frontend
            → useConcerns() hook updates UI
```

**Measured latency:** <2 seconds end-to-end. No polling anywhere.

---

## Relevant Message Detection

**Two-tier approach:**

1. **Regex pre-filter (instant)** — Rejects before hitting ML:
   - Greetings/farewells (`hi`, `bye`, `see you`)
   - Thanks (`thanks`, `ty`, `thank you`)
   - Acknowledgments (`ok`, `sounds good`)
   - Emoji-only or <3 words

2. **Semantic classification** — User-configurable:
   - *Embeddings* (Sentence Transformers `all-MiniLM-L6-v2`): Free, local, ~30-50ms
   - *LLM* (GPT-4o-mini with structured outputs): Better edge-case handling, higher cost

**Output categories:** `bug_report`, `feature_request`, `support_question`, `general_question`, `irrelevant`

**Extensibility:** Users can inject custom context into the LLM prompt for domain-specific deployments (e.g., a NEST thermostat deployment that should flag temperature complaints).

---

## Message Grouping

**5-level hierarchical algorithm:**

1. **Thread-based** — Same `thread_ts` + `channel_id` → same concern (high confidence)
2. **Exact hash** — Identical text → same concern
3. **Cosine similarity** — Compare message embedding against concern centroid embeddings
4. **Threshold decision:**
   - ≥0.80 similarity → auto-group (high confidence)
   - 0.65–0.80 → auto-group (medium confidence)
   - <0.65 → create new concern
5. **Temporal decay** — Recent concerns weighted higher (λ=0.05)

Centroids update incrementally as messages join a concern.

---

## Duplicate Handling

Grouping serves as implicit de-duplication—similar messages cluster into the same concern rather than creating separate tickets. I chose this over explicit de-dup to avoid hiding messages through over-aggressive normalization.

---

## Performance

- **<2 second latency** from Slack message to UI update
- Regex pre-filter rejects irrelevant messages before ML inference
- Local embeddings avoid API latency
- Similarity search capped at 100 candidate concerns
- Webhook returns immediately; processing is fire-and-forget

---

## Security

**Current state (localhost demo):**
- RLS enabled on all Supabase tables
- Backend uses service role key for writes
- Frontend uses anon key subject to RLS

**Production additions needed:**
- JWT validation on Python API endpoints
- Slack request signature verification
- Rate limiting
- Network isolation (backend only reachable from Edge Functions)

---

## AI vs. Manual Work

| Manual | AI-Assisted |
|--------|-------------|
| Tech stack selection (Supabase + Python + React) | Boilerplate generation |
| Split architecture decision (extensibility for ML iteration) | Supabase Edge Function syntax |
| Grouping algorithm design (centroid embeddings, thresholds) | Debugging suggestions |
| Decision to use grouping as implicit de-dup | React component scaffolding |

All generated code was reviewed and understood before committing.

---

## Challenges

| Problem | Solution |
|---------|----------|
| Slack events only include IDs, not names | Added `resolveNames()` helper that calls Slack API during webhook processing |
| Edge Functions couldn't reach `localhost` | Used `host.docker.internal` for Docker networking |
| Bot not receiving channel events | Added required scopes + manually invited bot to channels via `/invite` |
| Edge Functions constrain ML experimentation | Split architecture—Edge Functions handle ingestion, Python backend handles ML with full library access |