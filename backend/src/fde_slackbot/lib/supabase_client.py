"""
Environment-aware Supabase client for Python backend

Set SUPABASE_ENV to 'local' to use local Supabase (http://localhost:54321)
Set SUPABASE_ENV to 'production' (or leave unset) to use production Supabase

Usage:
    from fde_slackbot.lib.supabase_client import get_supabase_client

    supabase = get_supabase_client()
    result = supabase.table('messages').select('*').execute()
"""

import os
from typing import Literal
from supabase import create_client, Client

# Default local Supabase credentials (safe to hardcode for localhost)
LOCAL_URL = "http://localhost:54321"
LOCAL_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
LOCAL_SECRET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"


def get_supabase_env() -> Literal["local", "production"]:
    """Get the current Supabase environment"""
    return "local" if os.getenv("SUPABASE_ENV") == "local" else "production"


def get_supabase_client(use_secret_key: bool = False) -> Client:
    """
    Get a Supabase client configured for the current environment

    Args:
        use_secret_key: If True, use secret key (bypasses RLS)
                       If False, use publishable key (respects RLS)

    Returns:
        Configured Supabase client

    Environment Variables:
        SUPABASE_ENV: 'local' or 'production' (defaults to 'production')

        For production:
            SUPABASE_URL: Production Supabase URL
            SUPABASE_PUBLISHABLE_KEY: Production publishable key
            SUPABASE_SECRET_KEY: Production secret key

        For local (optional overrides):
            SUPABASE_LOCAL_URL: Local URL (defaults to http://localhost:54321)
            SUPABASE_LOCAL_PUBLISHABLE_KEY: Local publishable key (has default)
            SUPABASE_LOCAL_SECRET_KEY: Local secret key (has default)
    """
    env = get_supabase_env()
    is_local = env == "local"

    if is_local:
        # Local development with Supabase CLI
        url = os.getenv("SUPABASE_LOCAL_URL", LOCAL_URL)
        key = (
            os.getenv("SUPABASE_LOCAL_SECRET_KEY", LOCAL_SECRET_KEY)
            if use_secret_key
            else os.getenv("SUPABASE_LOCAL_PUBLISHABLE_KEY", LOCAL_PUBLISHABLE_KEY)
        )
        print(f"[Supabase] Using LOCAL environment: {url}")
    else:
        # Production
        url = os.getenv("SUPABASE_URL")
        key = (
            os.getenv("SUPABASE_SECRET_KEY")
            if use_secret_key
            else os.getenv("SUPABASE_PUBLISHABLE_KEY")
        )

        if not url or not key:
            raise ValueError(
                f"Missing Supabase credentials for production. "
                f"Required: SUPABASE_URL and "
                f"{'SUPABASE_SECRET_KEY' if use_secret_key else 'SUPABASE_PUBLISHABLE_KEY'}"
            )
        print(f"[Supabase] Using PRODUCTION environment: {url}")

    return create_client(url, key)


def get_supabase_admin_client() -> Client:
    """
    Get a Supabase client with secret key (admin access, bypasses RLS)

    Use this for:
    - Server-side operations that need to bypass Row Level Security
    - Admin operations
    - Background jobs

    Returns:
        Supabase client with secret key
    """
    return get_supabase_client(use_secret_key=True)


# Convenience exports
supabase = get_supabase_client()
supabase_admin = get_supabase_admin_client()


if __name__ == "__main__":
    # Test the connection
    env_info = get_supabase_env()
    print(f"\nEnvironment: {env_info}")
    print(f"URL: {supabase.supabase_url}")
    print(f"\nTesting connection...")

    try:
        # Simple health check
        result = supabase.table("messages").select("id").limit(1).execute()
        print(f"✅ Connection successful! Found {len(result.data)} message(s)")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
