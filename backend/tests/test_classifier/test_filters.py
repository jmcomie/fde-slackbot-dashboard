"""
Unit tests for RegexFilter.
"""

import pytest
from fde_slackbot.classifier.filters import RegexFilter


class TestRegexFilter:
    """Tests for the RegexFilter class."""

    def test_empty_message(self):
        """Test that empty messages are marked as irrelevant."""
        filter = RegexFilter()
        is_irrelevant, confidence, method = filter.is_irrelevant("")

        assert is_irrelevant is True
        assert confidence >= 0.95
        assert method == "regex"

    def test_greeting_messages(self):
        """Test that greeting messages are marked as irrelevant."""
        filter = RegexFilter()

        greetings = ["Hi", "Hello", "Hey!", "yo"]

        for greeting in greetings:
            is_irrelevant, confidence, method = filter.is_irrelevant(greeting)
            assert is_irrelevant is True, f"Failed for: {greeting}"
            assert confidence >= 0.8
            # Note: method can be "regex" or "length_filter" - both work
            assert method in ["regex", "length_filter"]

    def test_farewell_messages(self):
        """Test that farewell messages are marked as irrelevant."""
        filter = RegexFilter()

        farewells = ["Bye", "Goodbye", "See you", "Good night", "later"]

        for farewell in farewells:
            is_irrelevant, confidence, method = filter.is_irrelevant(farewell)
            assert is_irrelevant is True, f"Failed for: {farewell}"
            assert confidence >= 0.8
            assert method == "regex"

    def test_thanks_messages(self):
        """Test that thank you messages are marked as irrelevant."""
        filter = RegexFilter()

        thanks = ["Thanks", "Thank you", "thx", "ty"]

        for thank in thanks:
            is_irrelevant, confidence, method = filter.is_irrelevant(thank)
            assert is_irrelevant is True, f"Failed for: {thank}"
            assert confidence >= 0.8
            assert method == "regex"

    def test_acknowledgment_messages(self):
        """Test that simple acknowledgments are marked as irrelevant."""
        filter = RegexFilter()

        acks = ["ok", "Okay", "sounds good", "perfect", "cool"]

        for ack in acks:
            is_irrelevant, confidence, method = filter.is_irrelevant(ack)
            assert is_irrelevant is True, f"Failed for: {ack}"
            assert confidence >= 0.8
            assert method == "regex"

    def test_emoji_only_messages(self):
        """Test that emoji-only messages are marked as irrelevant."""
        filter = RegexFilter()

        emojis = ["👍", "😀", "🔥", "✅"]

        for emoji in emojis:
            is_irrelevant, confidence, method = filter.is_irrelevant(emoji)
            assert is_irrelevant is True, f"Failed for: {emoji}"
            assert confidence >= 0.8
            assert method == "regex"

    def test_short_messages(self):
        """Test that very short messages are marked as irrelevant."""
        filter = RegexFilter(min_words=3)

        short_messages = ["yes", "no", "one word"]

        for msg in short_messages:
            is_irrelevant, confidence, method = filter.is_irrelevant(msg)
            assert is_irrelevant is True, f"Failed for: {msg}"
            assert method == "length_filter"

    def test_relevant_bug_report(self):
        """Test that bug reports are not filtered out."""
        filter = RegexFilter()

        bug_reports = [
            "The login button doesn't work",
            "I'm getting an error when I save",
            "App keeps crashing",
        ]

        for bug in bug_reports:
            is_irrelevant, _, _ = filter.is_irrelevant(bug)
            assert is_irrelevant is False, f"Failed for: {bug}"

    def test_relevant_feature_request(self):
        """Test that feature requests are not filtered out."""
        filter = RegexFilter()

        requests = [
            "Can you add export to CSV?",
            "Would be nice to have dark mode",
            "Please add bulk editing",
        ]

        for req in requests:
            is_irrelevant, _, _ = filter.is_irrelevant(req)
            assert is_irrelevant is False, f"Failed for: {req}"

    def test_relevant_question(self):
        """Test that questions are not filtered out."""
        filter = RegexFilter()

        questions = [
            "How do I configure this?",
            "What's the best way to do this?",
            "Where can I find the docs?",
        ]

        for question in questions:
            is_irrelevant, _, _ = filter.is_irrelevant(question)
            assert is_irrelevant is False, f"Failed for: {question}"

    def test_add_pattern(self):
        """Test adding a new pattern."""
        filter = RegexFilter()

        # Use a multi-word phrase that won't be caught by length filter
        test_message = "be right back soon"

        # This shouldn't match initially
        is_irrelevant, _, _ = filter.is_irrelevant(test_message)
        assert is_irrelevant is False

        # Add pattern for "be right back"
        filter.add_pattern(r"^\s*be right back.*\s*$")

        # Should now match
        is_irrelevant, confidence, method = filter.is_irrelevant(test_message)
        assert is_irrelevant is True
        assert method == "regex"

    def test_remove_pattern(self):
        """Test removing a pattern."""
        filter = RegexFilter()

        # Use a multi-word phrase that won't be caught by length filter
        test_message = "just testing this thing"
        pattern = r"^\s*just testing.*\s*$"

        # Add the pattern
        filter.add_pattern(pattern)

        # Verify it matches
        is_irrelevant, _, method = filter.is_irrelevant(test_message)
        assert is_irrelevant is True
        assert method == "regex"

        # Remove the pattern
        removed = filter.remove_pattern(pattern)
        assert removed is True

        # Verify it no longer matches
        is_irrelevant, _, _ = filter.is_irrelevant(test_message)
        assert is_irrelevant is False

    def test_case_insensitivity(self):
        """Test that patterns are case insensitive."""
        filter = RegexFilter()

        variants = ["THANKS", "Thanks", "tHaNkS"]

        for variant in variants:
            is_irrelevant, _, _ = filter.is_irrelevant(variant)
            assert is_irrelevant is True, f"Failed for: {variant}"
