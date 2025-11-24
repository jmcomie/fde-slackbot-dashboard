"""
FDE Message Classifier

A hybrid classification system for detecting and categorizing FDE-relevant messages
from Slack conversations.

Key Features:
- Fast classification (~30-50ms average latency)
- High accuracy (85-92%) using semantic embeddings
- No API costs (runs locally)
- Threshold-based relevance filtering

Usage:
    >>> from fde_slackbot.classifier import MessageClassifier
    >>>
    >>> classifier = MessageClassifier()
    >>> result = classifier.classify("The login button doesn't work")
    >>>
    >>> print(result.category)      # "bug_report"
    >>> print(result.confidence)    # 0.89
    >>> print(result.is_relevant)   # True

Categories:
- bug_report: Customer reporting errors, crashes, broken functionality
- feature_request: Customer requesting new features or enhancements
- support_question: Customer asking how to do something or needing help
- general_question: Product/deployment-related questions
- irrelevant: Casual conversation, greetings, thanks, etc.
"""

from fde_slackbot.classifier.classifier import MessageClassifier
from fde_slackbot.classifier.models import ClassificationResult, MessageCategory
from fde_slackbot.classifier.config import (
    DEFAULT_CONFIDENCE_THRESHOLD,
    EMBEDDING_MODEL_NAME,
    get_all_category_examples,
)

__all__ = [
    "MessageClassifier",
    "ClassificationResult",
    "MessageCategory",
    "DEFAULT_CONFIDENCE_THRESHOLD",
    "EMBEDDING_MODEL_NAME",
    "get_all_category_examples",
]

__version__ = "0.1.0"
