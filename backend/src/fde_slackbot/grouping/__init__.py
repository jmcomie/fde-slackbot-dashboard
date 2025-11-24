"""
Concern grouping module for FDE Slackbot.

Provides semantic message grouping using embeddings and hierarchical decision logic.
"""

from fde_slackbot.grouping.grouper import ConcernGrouper
from fde_slackbot.grouping.models import (
    Concern,
    ConcernGroup,
    GroupingResult,
    ConcernWithMessages,
)
from fde_slackbot.grouping.db import (
    get_all_concerns,
    get_concern_by_id,
    get_messages_for_concern,
)

__all__ = [
    "ConcernGrouper",
    "Concern",
    "ConcernGroup",
    "GroupingResult",
    "ConcernWithMessages",
    "get_all_concerns",
    "get_concern_by_id",
    "get_messages_for_concern",
]
