# Supabase Local Development Research

**Research Date**: January 2025
**Topic**: Supabase local development support for Realtime Events and Workqueues (pgmq)

---

## Executive Summary

This document summarizes research on Supabase local development capabilities, specifically focusing on:
1. **Realtime Events**: Fully supported with complete feature parity
2. **Workqueues (pgmq)**: Supported but with ongoing configuration challenges

---

## 1. Supabase Local Development Environment Overview

Supabase's local development environment provides a complete, self-contained stack running via Docker containers.

### Key Features

- **Services Included**:
  - Local Postgres database
  - Authentication (Auth) services
  - File Storage capabilities
  - Realtime services
  - Edge Functions
  - All other Supabase features

### Benefits of Local Development

1. **Speed**: Instant feedback on changes without remote deployment delays
2. **Offline Capability**: Continue development without internet connectivity
3. **Cost Savings**: No consumption of project quotas or billing
4. **Privacy**: Sensitive data remains on your local machine
5. **Testing Flexibility**: Experiment safely without affecting production

### Requirements

- **Container Runtime**: Docker-compatible runtime required
  - Docker Desktop
  - Rancher Desktop
  - Podman
  - OrbStack (macOS only)

- **Supabase CLI**: Command-line tool for managing local environments
  - Local environment setup and management
  - TypeScript type generation for database schemas
  - Database migration handling
  - Environment variable and secrets management
  - Project deployment to Supabase platform

---

## 2. Realtime Events: ✅ FULLY SUPPORTED

### Status

**Realtime is fully supported in local development environments with complete feature parity to production.**

### Supported Features

All three realtime capabilities are available locally:

1. **Broadcast**: Real-time messaging and notifications
2. **Presence**: User online/offline status tracking
3. **Postgres Changes**: Database change listeners via WebSockets

### Local Configuration

- **WebSocket Endpoint**: `ws://[external_id].localhost:4000/socket/websocket`
- **Inspector Tool**: Built-in testing interface at `http://localhost:4000/inspector/new`
- **Default Tenant**: Pre-configured for immediate use
- **Customization**: 60+ environment variables available for fine-tuning

### Setup Process

1. Realtime runs automatically as part of the Supabase CLI's local Docker stack
2. No additional configuration required for basic usage
3. Can be customized via environment variables in Docker configuration
4. WebSocket connections require JWT authentication with `exp` and `role` claims

### Testing & Development Workflow

- Use the built-in inspector to test Broadcast, Presence, and Postgres Changes
- Create database tables and add them to publication: `alter publication supabase_realtime add table your_table`
- Access tenant configuration in `_realtime.tenants` and `_realtime.extensions` tables

### Known Issues

⚠️ **CLI Version Bug**:
- Supabase CLI versions **1.113.2 and later** had a regression bug affecting realtime functionality
- **Workaround**: Downgrade to CLI version **1.110.3** if encountering issues
  ```bash
  pnpm add supabase@1.110.3 --save-dev -w
  npx supabase stop
  npx supabase start
  ```
- Issue affected RLS policy visibility and realtime enablement in Studio UI
- Documented in GitHub issues [#1683](https://github.com/supabase/cli/issues/1683) and [#1684](https://github.com/supabase/cli/issues/1684)

### Verdict

✅ **Excellent local development support** - Realtime is stable, well-integrated, and fully functional in local environments.

---

## 3. Supabase Workqueues (pgmq): ⚠️ SUPPORTED WITH CAVEATS

### Status

**Queues are supported in local development, but with configuration challenges and ongoing stability issues.**

### Overview

- **Technology**: Built on the `pgmq` PostgreSQL extension
- **Type**: Postgres-native durable message queue with guaranteed delivery
- **Availability**: Preinstalled in local Supabase instances
- **Integration**: Works with Supabase Cron and Edge Functions

### Requirements

- **Postgres Version**: **15.6.1.143 or later** (critical requirement)
- **Extension**: `pgmq` (preinstalled, just needs enabling)
- **Schema Configuration**: Must expose `pgmq_public` schema

### Local Setup Instructions

#### 1. Configure Schema Exposure

Edit `supabase/config.toml`:
```toml
schemas = ["public", "graphql_public", "pgmq_public"]
```

#### 2. Enable the Extension

Enable via Dashboard (Integrations > Queues) or SQL:
```sql
CREATE EXTENSION IF NOT EXISTS pgmq;
```

#### 3. Enable PostgREST Access (Required for Client-Side Access)

Navigate to: **Integration > Queues > Settings**
- Toggle ON: "Expose Queues via PostgREST"
- This creates the `pgmq_public` schema with function wrappers

#### 4. Configure Row Level Security

For security, enable RLS on all queue tables:
```sql
-- All tables in pgmq schema that begin with q_
ALTER TABLE pgmq.q_your_queue_name ENABLE ROW LEVEL SECURITY;
```

### Queue Types Available

1. **Basic Queue**: Durable, logged (default)
2. **Unlogged Queue**: Transient, higher performance
3. **Partitioned Queue**: Coming soon

### Access Methods

1. **Direct Postgres Client**: Always works reliably
2. **PostgREST API**: Requires additional configuration (see issues below)
3. **Supabase Client Libraries**: Works after PostgREST exposure enabled

### Significant Issues 🚨

#### PostgREST Exposure Instability

The "Expose Queues via PostgREST" feature has been problematic:

- **Deliberately disabled** in CLI v2.6.8 due to "generating lots of issues"
- **Fixed** in v2.12.0
- **Broken again** in v2.12.1
- Simply adding `pgmq_public` to `config.toml` is **insufficient**
- Requires **manual UI toggle** even after configuration file updates
- Permissions are **lost after database resets** or version upgrades
- Functions may not appear in schema cache

#### Impact on Development Workflow

- Permission denied errors when attempting queue operations via PostgREST
- Must re-enable via console after each `supabase db reset`
- Configuration not fully declarative/reproducible
- Team members may encounter different behaviors

#### Documented Issues

- [GitHub Discussion #32969](https://github.com/orgs/supabase/discussions/32969): "Enabling exposure of Queues via PostgREST is temporarily disabled"
- Multiple community reports of permission and configuration issues

### Workarounds

1. **Use Direct Postgres Access**: Most reliable for local development
   ```typescript
   // Connect directly to Postgres instead of using PostgREST
   const { data, error } = await supabase.rpc('pgmq.send', {...})
   ```

2. **Manual SQL Migration**: Community members have created SQL scripts to manually create wrapper functions with proper permissions (requires maintenance as pgmq signatures change)

3. **Version Pinning**: Lock to a known working CLI version until issues are resolved

4. **Link to Cloud Instance**:
   ```bash
   supabase link  # Sync with cloud instance
   ```
   This can pull the correct Postgres version with queue support

### Verdict

⚠️ **Functional but challenging** - Core queue functionality works via Postgres, but PostgREST exposure (needed for client-side access) has ongoing stability issues requiring manual intervention.

---

## 4. Feature Comparison Summary

| Feature | Local Dev Support | Stability | Setup Complexity | Recommended for Local Dev |
|---------|-------------------|-----------|------------------|---------------------------|
| **Realtime Events** | ✅ Full Support | High (with version caveats) | Low - works out of box | ✅ Yes |
| **Workqueues (pgmq)** | ⚠️ Supported | Medium - PostgREST issues | Medium-High - manual steps | ⚠️ Yes, with caveats |

### Key Takeaways

1. **Realtime**: Production-ready for local development. Minor CLI version issues are easily resolved.

2. **Workqueues**:
   - Core functionality is solid (it's just Postgres)
   - Client-side access via PostgREST has configuration challenges
   - Best suited for developers comfortable with SQL and manual configuration
   - Consider using direct Postgres access for local development

3. **General Recommendation**: Both features are usable locally, but Realtime provides a smoother developer experience out of the box.

---

## 5. Best Practices for Local Development

### For Realtime

1. Use CLI version 1.110.3 if encountering issues with newer versions
2. Test with the built-in inspector before integrating into application code
3. Configure RLS policies locally to match production security
4. Use private channels for sensitive data

### For Workqueues

1. Pin your CLI version to avoid unexpected behavior changes
2. Prefer direct Postgres access for local development
3. Document manual setup steps for team members
4. Test PostgREST access after each database reset
5. Consider maintaining a SQL migration for queue function wrappers
6. Ensure Postgres version is 15.6.1.143 or later

### General

1. Use Docker-compatible container runtime (Docker Desktop, Rancher, etc.)
2. Keep `supabase/config.toml` in version control
3. Document environment-specific configuration requirements
4. Test locally before deploying to production
5. Monitor Supabase changelog for updates to local development features

---

## 6. Additional Resources

### Official Documentation

- [Local Development & CLI](https://supabase.com/docs/guides/local-development) - Main local development guide
- [Local Development with Schema Migrations](https://supabase.com/docs/guides/local-development/overview) - Migration workflows
- [Getting Started with Realtime](https://supabase.com/docs/guides/realtime/getting_started) - Realtime overview
- [Supabase Queues Documentation](https://supabase.com/docs/guides/queues) - Queues overview
- [Queues Quickstart](https://supabase.com/docs/guides/queues/quickstart) - Setup guide
- [pgmq Extension](https://supabase.com/docs/guides/database/extensions/pgmq) - Extension details

### GitHub Resources

- [Supabase Realtime Repository](https://github.com/supabase/realtime) - Source code and development setup
- [pgmq Repository](https://github.com/pgmq/pgmq) - Lightweight message queue on Postgres

### Community Resources

- [Stack Overflow: CLI Problems with Realtime](https://stackoverflow.com/questions/77534982/supabase-cli-local-development-problems-with-rls-and-enabling-realtime) - Common issues and solutions
- [DEV Community: Build Queue Worker](https://dev.to/suciptoid/build-queue-worker-using-supabase-cron-queue-and-edge-function-19di) - Practical tutorial
- [GitHub Discussion #32969](https://github.com/orgs/supabase/discussions/32969) - PostgREST exposure issues

### Tools & CLI

- [Supabase CLI Documentation](https://supabase.com/docs/guides/local-development/cli/getting-started) - CLI reference
- [Getting Started with Supabase CLI](https://supalaunch.com/blog/supabase-cli) - Third-party guide

---

## Conclusion

Supabase's local development environment provides strong support for both Realtime Events and Workqueues, though with varying degrees of maturity:

- **Realtime Events** offer production-ready local development with minimal setup
- **Workqueues** are functional but require more manual configuration and awareness of PostgREST exposure limitations

Both features enable offline development, cost savings, and rapid iteration—core benefits of the Supabase local development experience. Developers should be aware of the current limitations and use the recommended workarounds until the underlying issues are resolved in future CLI versions.

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Research Conducted By**: Web search and documentation analysis
