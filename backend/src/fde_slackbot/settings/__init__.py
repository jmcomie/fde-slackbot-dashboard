"""
Settings management module.

Provides access to application-wide settings stored in Supabase.
"""

from fde_slackbot.settings.db import get_settings
from fde_slackbot.settings.models import Settings

__all__ = ["get_settings", "Settings"]
