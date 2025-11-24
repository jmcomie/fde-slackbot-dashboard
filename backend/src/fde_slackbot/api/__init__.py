"""
FDE Slackbot API

Simple FastAPI server for processing Slack messages through the
classifier and grouper pipeline.
"""

from fde_slackbot.api.main import app

__all__ = ["app"]
