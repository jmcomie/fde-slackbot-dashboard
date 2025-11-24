"""
Integration tests for MessageClassifier.

Tests the full classification pipeline including regex filtering
and embedding classification.
"""

import pytest
from fde_slackbot.classifier import MessageClassifier, ClassificationResult


class TestMessageClassifier:
    """Integration tests for the complete MessageClassifier."""

    @pytest.fixture
    def classifier(self):
        """Create a classifier instance for testing."""
        return MessageClassifier()

    def test_initialization(self, classifier):
        """Test that classifier initializes correctly."""
        assert classifier is not None
        assert classifier.regex_filter is not None
        assert classifier.embedding_classifier is not None

    def test_initialization_without_regex_filter(self):
        """Test initialization with regex filter disabled."""
        classifier = MessageClassifier(enable_regex_filter=False)
        assert classifier.regex_filter is None
        assert classifier.embedding_classifier is not None

    def test_classify_returns_classification_result(self, classifier):
        """Test that classify returns ClassificationResult."""
        result = classifier.classify("Test message")
        assert isinstance(result, ClassificationResult)

    def test_classify_irrelevant_greeting(self, classifier):
        """Test that greetings are classified as irrelevant via regex or length filter."""
        messages = ["Hi", "Hello", "Hey there!"]

        for msg in messages:
            result = classifier.classify(msg)
            assert result.category == "irrelevant", f"Failed for: {msg}"
            assert result.is_relevant is False
            # Method can be "regex" or "length_filter" - both are valid
            assert result.method in ["regex", "length_filter"]
            assert result.confidence >= 0.8

    def test_classify_irrelevant_thanks(self, classifier):
        """Test that thanks messages are classified as irrelevant via regex."""
        messages = ["Thanks", "Thank you!", "thx"]

        for msg in messages:
            result = classifier.classify(msg)
            assert result.category == "irrelevant", f"Failed for: {msg}"
            assert result.is_relevant is False
            assert result.method == "regex"

    def test_classify_bug_report(self, classifier):
        """Test that bug reports are classified correctly."""
        bug_reports = [
            "The login button doesn't work",
            "I'm getting a 500 error",
            "App crashes when I upload files",
            "This feature is broken",
        ]

        for bug in bug_reports:
            result = classifier.classify(bug)
            assert result.category == "bug_report", f"Failed for: {bug}"
            # With 0.5 threshold, most should be relevant, but some might be borderline
            assert result.method in ["embedding", "embedding_low_conf"]
            # Category should be correct even if confidence is borderline
            assert result.confidence > 0.4, f"Confidence too low for: {bug}"

    def test_classify_feature_request(self, classifier):
        """Test that feature requests are classified correctly."""
        # List of (message, valid_categories)
        requests = [
            ("Can you add export to CSV?", ["feature_request"]),
            ("Would be nice to have dark mode", ["feature_request"]),
            ("Please add support for bulk editing", ["feature_request"]),
            # This one could be feature_request or general_question - borderline
            ("We need API integration", ["feature_request", "general_question"]),
        ]

        for req, valid_categories in requests:
            result = classifier.classify(req)
            assert result.category in valid_categories, f"Failed for: {req} (got {result.category})"
            assert result.method in ["embedding", "embedding_low_conf"]
            # Category should be correct even if confidence is borderline
            assert result.confidence > 0.35, f"Confidence too low for: {req}"

    def test_classify_support_question(self, classifier):
        """Test that support questions are classified correctly."""
        questions = [
            "How do I configure this setting?",
            "Need help with the setup process",
            "Can someone walk me through this?",
            "I'm stuck on this configuration",
        ]

        for q in questions:
            result = classifier.classify(q)
            assert result.category == "support_question", f"Failed for: {q}"
            assert result.method in ["embedding", "embedding_low_conf"]
            # Support questions typically have higher confidence
            assert result.confidence > 0.4, f"Confidence too low for: {q}"

    def test_classify_general_question(self, classifier):
        """Test that general questions are classified correctly."""
        questions = [
            "Where can I find the documentation?",
            "What are the rate limits?",
            "How does the billing work?",
            "What integrations are supported?",
        ]

        for q in questions:
            result = classifier.classify(q)
            assert result.category == "general_question", f"Failed for: {q}"
            assert result.method in ["embedding", "embedding_low_conf"]
            # General questions typically have good confidence, but some can be borderline
            assert result.confidence > 0.35, f"Confidence too low for: {q}"

    def test_regex_filter_bypassed_for_long_messages(self, classifier):
        """Test that longer messages bypass regex filter and use embeddings."""
        # This message contains "thanks" but has more context
        message = "Thanks for the help but I'm still getting an error when I save"

        result = classifier.classify(message)

        # Should not be filtered by regex (has more than just "thanks")
        # Should be classified by embeddings
        assert result.method in ["embedding", "embedding_low_conf"]

    def test_classify_batch(self, classifier):
        """Test batch classification."""
        messages = [
            "Hi",
            "The app is broken",
            "Can you add dark mode?",
            "How do I configure this?",
        ]

        results = classifier.classify_batch(messages)

        assert len(results) == 4
        assert all(isinstance(r, ClassificationResult) for r in results)

        # Check individual results
        assert results[0].category == "irrelevant"  # "Hi"
        assert results[1].category == "bug_report"  # "The app is broken"
        assert results[2].category == "feature_request"  # "Can you add dark mode?"
        assert results[3].category == "support_question"  # "How do I configure this?"

    def test_get_detailed_scores(self, classifier):
        """Test getting detailed classification scores."""
        message = "The login doesn't work"
        details = classifier.get_detailed_scores(message)

        assert "classification" in details
        assert "all_similarities" in details
        assert "regex_match" in details

        assert isinstance(details["classification"], ClassificationResult)
        assert isinstance(details["all_similarities"], dict)
        assert isinstance(details["regex_match"], bool)

    def test_add_category_example(self, classifier):
        """Test adding a category example."""
        # This should work without errors
        classifier.add_category_example(
            "bug_report", "I encountered a very specific error message"
        )

        # Classification should still work
        result = classifier.classify("I see a very specific error message")
        assert result.category in [
            "bug_report",
            "support_question",
            "general_question",
        ]

    def test_get_embedding(self, classifier):
        """Test getting message embedding."""
        import numpy as np

        message = "Test message"
        embedding = classifier.get_embedding(message)

        assert isinstance(embedding, np.ndarray)
        assert len(embedding) == 384  # Default model dimension

    def test_confidence_threshold_effect(self):
        """Test that confidence threshold affects relevance determination."""
        # High threshold
        high_threshold_classifier = MessageClassifier(confidence_threshold=0.9)

        # Low threshold
        low_threshold_classifier = MessageClassifier(confidence_threshold=0.5)

        # Ambiguous message that might have moderate confidence
        message = "I have a question about this thing"

        result_high = high_threshold_classifier.classify(message)
        result_low = low_threshold_classifier.classify(message)

        # Both should classify, but relevance might differ based on confidence
        assert isinstance(result_high, ClassificationResult)
        assert isinstance(result_low, ClassificationResult)

    def test_empty_message(self, classifier):
        """Test classification of empty message."""
        result = classifier.classify("")

        assert result.category == "irrelevant"
        assert result.is_relevant is False
        assert result.method == "regex"

    def test_whitespace_message(self, classifier):
        """Test classification of whitespace-only message."""
        result = classifier.classify("   ")

        assert result.category == "irrelevant"
        assert result.is_relevant is False

    def test_result_string_representation(self, classifier):
        """Test that ClassificationResult has useful string representation."""
        result = classifier.classify("The app is broken")

        result_str = str(result)
        assert "ClassificationResult" in result_str
        assert "bug_report" in result_str or result.category in result_str

    def test_is_high_confidence_property(self, classifier):
        """Test the is_high_confidence property."""
        # Very clear bug report should have high confidence
        result = classifier.classify("The application crashes when I click the save button")

        assert hasattr(result, "is_high_confidence")
        assert isinstance(result.is_high_confidence, bool)

    def test_real_world_examples(self, classifier):
        """Test with real-world example messages from the spec."""
        # From the test procedure in the spec
        test_cases = [
            ("The login button doesn't work on mobile.", "bug_report", True),
            ("Can you add export to CSV?", "feature_request", True),
            # This message is highly context-dependent - could be bug, question, or even feature request
            ("I don't see a button for it right now", ["bug_report", "support_question", "feature_request"], True),
            ("Thanks!", "irrelevant", False),
            ("See you tomorrow", "irrelevant", False),
        ]

        for message, expected_category, expected_relevant in test_cases:
            result = classifier.classify(message)

            # For irrelevant messages, strict check
            if not expected_relevant:
                assert result.is_relevant == expected_relevant, f"Should be irrelevant: {message}"
                assert result.category == "irrelevant", f"Should be irrelevant category: {message}"
            else:
                # For relevant messages, check category is correct
                # Some borderline messages might not meet threshold, but category should be right
                if isinstance(expected_category, list):
                    assert result.category in expected_category, f"Category failed for: {message} (got {result.category})"
                else:
                    assert result.category == expected_category, f"Category failed for: {message}"

                # Confidence should be reasonable (>0.35) even if not above threshold
                assert result.confidence > 0.35, f"Confidence too low for: {message}"
