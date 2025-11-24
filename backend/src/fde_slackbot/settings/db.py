"""
Database operations for settings management.

Handles fetching application-wide settings from Supabase.
"""

from typing import Optional
from uuid import UUID

from fde_slackbot.lib.supabase_client import get_supabase_client
from fde_slackbot.settings.models import Settings


# Cache settings to avoid repeated database calls
_settings_cache: Optional[Settings] = None


def get_settings(use_cache: bool = True) -> Settings:
    """
    Fetch application settings from the database.

    Settings are stored as a single row in the settings table.
    Results are cached by default for performance.

    Args:
        use_cache: Whether to use cached settings (default: True)

    Returns:
        Settings object with current configuration

    Raises:
        Exception: If settings cannot be fetched
    """
    global _settings_cache

    # Return cached settings if available
    if use_cache and _settings_cache is not None:
        return _settings_cache

    # Fetch from database (no need for service role, settings are public)
    supabase = get_supabase_client(use_secret_key=False)

    response = supabase.table('settings').select('*').limit(1).execute()

    if not response.data or len(response.data) == 0:
        raise Exception("Settings not found in database. Run migrations first.")

    # Parse response into Settings model
    settings = Settings(**response.data[0])

    # Cache for future requests
    _settings_cache = settings

    return settings


def clear_settings_cache():
    """
    Clear the cached settings.

    Call this when settings are updated to force a refresh on next fetch.
    """
    global _settings_cache
    _settings_cache = None


def get_bot_name() -> Optional[str]:
    """
    Convenience function to get just the bot name.

    Returns:
        Bot name string if configured, None otherwise
    """
    settings = get_settings()
    return settings.bot_name


def get_classification_method() -> str:
    """
    Convenience function to get the classification method.

    Returns:
        'embedding' or 'llm'
    """
    settings = get_settings()
    return settings.classification_method


def get_llm_model() -> str:
    """
    Convenience function to get the LLM model name.

    Returns:
        OpenAI model name (e.g., 'gpt-4o-mini')
    """
    settings = get_settings()
    return settings.llm_model
