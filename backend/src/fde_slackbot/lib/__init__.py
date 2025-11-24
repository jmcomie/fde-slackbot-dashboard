"""
Shared utilities and clients for FDE Slackbot.
"""

from fde_slackbot.lib.supabase_client import (
    get_supabase_client,
    get_supabase_admin_client,
    get_supabase_env,
)

__all__ = [
    "get_supabase_client",
    "get_supabase_admin_client",
    "get_supabase_env",
]
