"""
Configuration for message classification.

Contains category definitions, example messages, and threshold settings.
"""

from typing import Dict, List

# Classification confidence thresholds
DEFAULT_CONFIDENCE_THRESHOLD = 0.5
"""Minimum confidence score to consider a message relevant

Note: This threshold is set to 0.5 based on empirical testing with sentence transformers.
When comparing messages to category centroids (averaged embeddings), similarity scores
typically range from 0.45-0.75 for relevant messages. A threshold of 0.5 provides good
balance between recall (catching relevant messages) and precision (avoiding noise).

Users can adjust this threshold when initializing MessageClassifier:
    classifier = MessageClassifier(confidence_threshold=0.6)  # stricter
    classifier = MessageClassifier(confidence_threshold=0.45) # more inclusive
"""

LLM_FALLBACK_THRESHOLD = 0.45
"""Confidence threshold below which LLM fallback would be used (if implemented)"""

# Regex patterns for irrelevant messages
IRRELEVANT_PATTERNS = [
    # Common greetings
    r'^\s*(hi|hey|hello|sup|yo)\s*[!.]*\s*$',
    # Common farewells
    r'^\s*(bye|goodbye|see you.*|good ?night|later|cya)\s*[!.]*\s*$',
    # Thanks/acknowledgments
    r'^\s*(thanks?|thx|ty|thank you|appreciated)\s*[!.]*\s*$',
    # Simple acknowledgments
    r'^\s*(ok|okay|sounds good|perfect|great|awesome|cool)\s*[!.]*\s*$',
    # Emoji-only messages
    r'^\s*[😀-🙏👍👎💯🔥✅❌]+\s*$',
    # Thumbs up/down reactions
    r'^\s*(:thumbsup:|:thumbsdown:|:+1:|:-1:|👍|👎)\s*$',
    # LOL/LMAO
    r'^\s*(lol|lmao|haha|hehe|rofl)\s*[!.]*\s*$',
]

# Minimum word count for relevance
MIN_WORD_COUNT = 3
"""Messages with fewer words are likely irrelevant"""

# Category example messages for embedding-based classification
CATEGORY_EXAMPLES: Dict[str, List[str]] = {
    "bug_report": [
        "The login button doesn't work on mobile",
        "I'm getting an error when I try to save",
        "The app keeps crashing when I upload files",
        "This feature is broken - it's not responding",
        "Getting a 500 error on the API",
        "The dashboard won't load, just showing a blank screen",
        "Data isn't syncing properly between devices",
        "Search functionality returns incorrect results",
    ],
    "feature_request": [
        "Can you add export to CSV?",
        "Would be nice to have dark mode",
        "I wish there was a way to bulk edit items",
        "Please add support for API integration",
        "Could we get email notifications for this?",
        "It would be great to have keyboard shortcuts",
        "Can you implement two-factor authentication?",
        "We need better filtering options on the dashboard",
    ],
    "support_question": [
        "How do I configure this setting?",
        "Need help setting up the integration",
        "I'm stuck on the onboarding process",
        "Can someone help me with this configuration?",
        "Having trouble understanding how to use this feature",
        "What am I doing wrong here?",
        "Can you walk me through the setup process?",
        "I don't understand how to configure the permissions",
    ],
    "general_question": [
        "What's the best way to organize my projects?",
        "Where can I find the documentation?",
        "Can someone explain how the API works?",
        "What are the rate limits for the API?",
        "Is there a way to automate this workflow?",
        "What integrations are supported?",
        "How does the billing work for this feature?",
        "What's the difference between these two plans?",
    ],
}

# Embedding model configuration
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
"""Lightweight sentence transformer model for fast classification"""

EMBEDDING_SIMILARITY_THRESHOLD = 0.7
"""Minimum cosine similarity to assign a category with confidence (sentence-transformers)"""

OPENAI_EMBEDDING_SIMILARITY_THRESHOLD = 0.5
"""Minimum cosine similarity to assign a category with confidence (OpenAI embeddings)"""


def get_all_category_examples() -> Dict[str, List[str]]:
    """
    Get all category examples.

    Returns:
        Dictionary mapping category names to example messages
    """
    return CATEGORY_EXAMPLES.copy()


def get_category_examples(category: str) -> List[str]:
    """
    Get example messages for a specific category.

    Args:
        category: Category name (bug_report, feature_request, support_question, general_question)

    Returns:
        List of example messages for the category

    Raises:
        KeyError: If category is not found
    """
    return CATEGORY_EXAMPLES[category]
