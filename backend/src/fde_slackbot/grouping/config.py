"""
Configuration for concern grouping system.

Defines thresholds, parameters, and settings for semantic message grouping.
"""

# Similarity thresholds
HIGH_CONFIDENCE_THRESHOLD = 0.80
"""Auto-group messages with similarity >= 0.80 (high confidence)"""

MEDIUM_CONFIDENCE_THRESHOLD = 0.65
"""Auto-group messages with similarity between 0.65-0.80 (medium confidence)"""

LOW_SIMILARITY_THRESHOLD = 0.65
"""Below this threshold, create new concern"""

# Temporal decay parameters
TEMPORAL_DECAY_LAMBDA = 0.05
"""Decay factor for weighting old concerns lower in similarity matching"""

MAX_CONCERN_AGE_DAYS = 30
"""Only consider concerns created within this many days for grouping"""

# Deduplication settings
EXACT_MATCH_ENABLED = True
"""Enable exact text hash matching for deduplication"""

# Performance settings
MAX_CANDIDATES_TO_COMPARE = 100
"""Maximum number of candidate concerns to compare against (for performance)"""

# Title generation
MAX_TITLE_LENGTH = 100
"""Maximum length for auto-generated concern titles"""

# Concern statuses
CONCERN_STATUSES = ["open", "in_progress", "resolved", "closed"]
"""Valid concern status values"""

# Concern priorities
CONCERN_PRIORITIES = ["high", "medium", "low"]
"""Valid concern priority values"""

# Grouping methods
GROUPING_METHODS = {
    "new_concern": "high",  # New concern created (first message)
    "thread_match": "high",  # Grouped by thread_ts match
    "cosine_high_conf": "high",  # Cosine similarity >= 0.88
    "cosine_medium_conf": "medium",  # Cosine similarity 0.75-0.88
    "low_similarity": "low",  # Below threshold, created new concern
    "exact_duplicate": "high",  # Exact text match
    "manual": "high",  # Manually grouped by user
    "initial": "high",  # Initial message that created the concern
}
"""Mapping of grouping methods to confidence levels"""
