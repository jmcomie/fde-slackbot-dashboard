"""
Unit tests for EmbeddingClassifier.
"""

import pytest
import numpy as np
from fde_slackbot.classifier.embeddings import EmbeddingClassifier


class TestEmbeddingClassifier:
    """Tests for the EmbeddingClassifier class."""

    @pytest.fixture
    def classifier(self):
        """Create a classifier instance for testing."""
        return EmbeddingClassifier()

    def test_initialization(self, classifier):
        """Test that classifier initializes correctly."""
        assert classifier.model is not None
        assert classifier.category_embeddings is not None
        assert len(classifier.category_embeddings) == 4  # 4 relevant categories

    def test_classify_bug_report(self, classifier):
        """Test classification of bug reports."""
        bug_messages = [
            "The login button doesn't work",
            "Getting a 500 error",
            "App crashes when I click save",
        ]

        for msg in bug_messages:
            category, confidence = classifier.classify(msg)
            assert category == "bug_report", f"Failed for: {msg}"
            assert 0.0 <= confidence <= 1.0

    def test_classify_feature_request(self, classifier):
        """Test classification of feature requests."""
        feature_messages = [
            ("Can you add export to CSV?", ["feature_request"]),
            ("Would be nice to have dark mode", ["feature_request"]),
            # "Please support API integration" could be feature_request or general_question
            ("Please support API integration", ["feature_request", "general_question"]),
        ]

        for msg, valid_categories in feature_messages:
            category, confidence = classifier.classify(msg)
            assert category in valid_categories, f"Failed for: {msg} (got {category})"
            assert 0.0 <= confidence <= 1.0

    def test_classify_support_question(self, classifier):
        """Test classification of support questions."""
        support_messages = [
            "How do I configure this setting?",
            "Need help with the setup",
            "Can someone help me with this?",
        ]

        for msg in support_messages:
            category, confidence = classifier.classify(msg)
            assert category == "support_question", f"Failed for: {msg}"
            assert 0.0 <= confidence <= 1.0

    def test_classify_general_question(self, classifier):
        """Test classification of general questions."""
        general_messages = [
            "Where can I find the documentation?",
            "What are the rate limits?",
            "How does the billing work?",
        ]

        for msg in general_messages:
            category, confidence = classifier.classify(msg)
            assert category == "general_question", f"Failed for: {msg}"
            assert 0.0 <= confidence <= 1.0

    def test_classify_with_threshold(self, classifier):
        """Test classification with threshold checking."""
        message = "The app is broken and won't load"
        category, confidence, meets_threshold = classifier.classify_with_threshold(message)

        assert category == "bug_report"
        assert 0.0 <= confidence <= 1.0
        assert isinstance(meets_threshold, bool)

    def test_get_all_similarities(self, classifier):
        """Test getting all similarity scores."""
        message = "The login doesn't work"
        similarities = classifier.get_all_similarities(message)

        assert isinstance(similarities, dict)
        assert len(similarities) == 4  # 4 relevant categories
        assert all(0.0 <= score <= 1.0 for score in similarities.values())
        assert "bug_report" in similarities

    def test_add_category_example(self, classifier):
        """Test adding a new example to a category."""
        # Get initial classification
        message = "This specific error message appears"
        category_before, confidence_before = classifier.classify(message)

        # Add a similar example to bug_report category
        classifier.add_category_example("bug_report", "I see this specific error message")

        # Classification should still work (and potentially with higher confidence)
        category_after, confidence_after = classifier.classify(message)
        assert category_after in ["bug_report", "support_question", "general_question"]

    def test_add_category_example_invalid_category(self, classifier):
        """Test that adding example to invalid category raises error."""
        with pytest.raises(KeyError):
            classifier.add_category_example("invalid_category", "test message")

    def test_get_embedding(self, classifier):
        """Test getting embedding vector for a message."""
        message = "Test message"
        embedding = classifier.get_embedding(message)

        assert isinstance(embedding, np.ndarray)
        assert len(embedding) == 384  # all-MiniLM-L6-v2 has 384 dimensions
        assert embedding.dtype == np.float32

    def test_embedding_consistency(self, classifier):
        """Test that same message produces same embedding."""
        message = "Consistent message"

        embedding1 = classifier.get_embedding(message)
        embedding2 = classifier.get_embedding(message)

        np.testing.assert_array_almost_equal(embedding1, embedding2)

    def test_similar_messages_similar_embeddings(self, classifier):
        """Test that similar messages have similar embeddings."""
        from sklearn.metrics.pairwise import cosine_similarity

        msg1 = "The login button is broken"
        msg2 = "The login button doesn't work"

        emb1 = classifier.get_embedding(msg1)
        emb2 = classifier.get_embedding(msg2)

        similarity = cosine_similarity(emb1.reshape(1, -1), emb2.reshape(1, -1))[0][0]

        # Similar messages should have high similarity (> 0.7)
        assert similarity > 0.7

    def test_different_messages_different_embeddings(self, classifier):
        """Test that very different messages have different embeddings."""
        from sklearn.metrics.pairwise import cosine_similarity

        msg1 = "The app is completely broken"
        msg2 = "Can we have a meeting tomorrow?"

        emb1 = classifier.get_embedding(msg1)
        emb2 = classifier.get_embedding(msg2)

        similarity = cosine_similarity(emb1.reshape(1, -1), emb2.reshape(1, -1))[0][0]

        # Different messages should have lower similarity
        assert similarity < 0.8

    def test_confidence_scores_valid_range(self, classifier):
        """Test that all confidence scores are in valid range [0, 1]."""
        messages = [
            "Bug report test",
            "Feature request test",
            "Support question test",
            "General question test",
            "Random text here",
        ]

        for msg in messages:
            category, confidence = classifier.classify(msg)
            assert 0.0 <= confidence <= 1.0, f"Invalid confidence for: {msg}"
            assert isinstance(confidence, float)
