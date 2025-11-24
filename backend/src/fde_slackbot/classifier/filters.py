"""
Regex-based pre-filtering for message classification.

Fast pattern matching to quickly identify obvious irrelevant messages.
"""

import re
from typing import Optional, Tuple

from fde_slackbot.classifier.config import IRRELEVANT_PATTERNS, MIN_WORD_COUNT


class RegexFilter:
    """
    Fast regex-based filter for identifying obviously irrelevant messages.

    This is the first tier of the classification pipeline, designed to quickly
    filter out casual messages (greetings, thanks, emoji-only, etc.) without
    needing to run embedding models.
    """

    def __init__(self, patterns: Optional[list[str]] = None, min_words: int = MIN_WORD_COUNT):
        """
        Initialize the regex filter.

        Args:
            patterns: List of regex patterns for irrelevant messages.
                     If None, uses default patterns from config.
            min_words: Minimum number of words for a message to be considered relevant.
                      Messages with fewer words are marked irrelevant.
        """
        self.patterns = patterns if patterns is not None else IRRELEVANT_PATTERNS
        self.min_words = min_words

        # Compile patterns for better performance
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE) for pattern in self.patterns
        ]

    def is_irrelevant(self, message: str) -> Tuple[bool, float, str]:
        """
        Check if message matches irrelevant patterns.

        Args:
            message: The message text to check

        Returns:
            Tuple of (is_irrelevant, confidence, method):
                - is_irrelevant: True if message is irrelevant
                - confidence: Confidence score (0.8-0.95 for matches)
                - method: "regex" or "length_filter"
        """
        # Clean the message
        clean_message = message.strip()

        # Check if message is empty
        if not clean_message:
            return (True, 0.99, "regex")

        # Check against regex patterns
        for pattern in self.compiled_patterns:
            if pattern.match(clean_message.lower()):
                return (True, 0.95, "regex")

        # Check word count
        word_count = len(clean_message.split())
        if word_count < self.min_words:
            # Higher confidence for very short messages (1 word)
            confidence = 0.90 if word_count == 1 else 0.85
            return (True, confidence, "length_filter")

        # Not matched by any filter
        return (False, 0.0, "regex")

    def add_pattern(self, pattern: str) -> None:
        """
        Add a new regex pattern to the filter.

        Args:
            pattern: Regex pattern string to add
        """
        self.patterns.append(pattern)
        self.compiled_patterns.append(re.compile(pattern, re.IGNORECASE))

    def remove_pattern(self, pattern: str) -> bool:
        """
        Remove a regex pattern from the filter.

        Args:
            pattern: Regex pattern string to remove

        Returns:
            True if pattern was found and removed, False otherwise
        """
        try:
            idx = self.patterns.index(pattern)
            self.patterns.pop(idx)
            self.compiled_patterns.pop(idx)
            return True
        except ValueError:
            return False
