"""
Embedding-based message classification using Sentence Transformers.

Uses lightweight sentence transformers to convert messages to embeddings
and classify them based on cosine similarity to category examples.
"""

from typing import Dict, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from fde_slackbot.classifier.config import (
    EMBEDDING_MODEL_NAME,
    EMBEDDING_SIMILARITY_THRESHOLD,
    get_all_category_examples,
)
from fde_slackbot.classifier.models import MessageCategory


class EmbeddingClassifier:
    """
    Embedding-based classifier for message categorization.

    Uses Sentence Transformers to convert messages to vector embeddings
    and classifies them based on cosine similarity to pre-computed
    category centroid embeddings.

    This provides good semantic understanding while remaining fast
    (~20-50ms per message on CPU).
    """

    def __init__(
        self,
        model_name: str = EMBEDDING_MODEL_NAME,
        similarity_threshold: float = EMBEDDING_SIMILARITY_THRESHOLD,
        category_examples: Optional[Dict[str, list[str]]] = None,
    ):
        """
        Initialize the embedding classifier.

        Args:
            model_name: Name of the sentence transformer model to use.
                       Default: "all-MiniLM-L6-v2" (384 dimensions, fast)
            similarity_threshold: Minimum cosine similarity to assign category.
                                 Default: 0.7
            category_examples: Optional custom category examples.
                             If None, uses examples from config.
        """
        self.model_name = model_name
        self.similarity_threshold = similarity_threshold

        # Load the sentence transformer model
        # This is cached after first load, so subsequent initializations are fast
        self.model = SentenceTransformer(model_name)

        # Get category examples
        self.category_examples = (
            category_examples if category_examples is not None else get_all_category_examples()
        )

        # Pre-compute category centroid embeddings
        self.category_embeddings = self._compute_category_embeddings()

    def _compute_category_embeddings(self) -> Dict[str, np.ndarray]:
        """
        Compute centroid embeddings for each category.

        Returns:
            Dictionary mapping category names to centroid embeddings
        """
        category_embeddings = {}

        for category, examples in self.category_examples.items():
            # Encode all examples for this category
            embeddings = self.model.encode(examples, show_progress_bar=False)

            # Compute mean embedding (centroid)
            centroid = np.mean(embeddings, axis=0)
            category_embeddings[category] = centroid

        return category_embeddings

    def classify(self, message: str) -> tuple[MessageCategory, float]:
        """
        Classify a message into one of the defined categories.

        Args:
            message: The message text to classify

        Returns:
            Tuple of (category, confidence_score):
                - category: The best matching category
                - confidence: Cosine similarity score (0.0-1.0)
        """
        # Generate embedding for the message
        message_embedding = self.model.encode([message], show_progress_bar=False)[0]

        # Calculate similarity to each category
        similarities = {}
        for category, category_embedding in self.category_embeddings.items():
            similarity = cosine_similarity(
                message_embedding.reshape(1, -1), category_embedding.reshape(1, -1)
            )[0][0]
            similarities[category] = float(similarity)

        # Get best match
        best_category = max(similarities, key=similarities.get)
        confidence = similarities[best_category]

        return (best_category, confidence)  # type: ignore

    def classify_with_threshold(self, message: str) -> tuple[MessageCategory, float, bool]:
        """
        Classify a message and check if confidence meets threshold.

        Args:
            message: The message text to classify

        Returns:
            Tuple of (category, confidence, meets_threshold):
                - category: The best matching category
                - confidence: Cosine similarity score (0.0-1.0)
                - meets_threshold: True if confidence >= similarity_threshold
        """
        category, confidence = self.classify(message)
        meets_threshold = confidence >= self.similarity_threshold
        return (category, confidence, meets_threshold)

    def get_all_similarities(self, message: str) -> Dict[str, float]:
        """
        Get similarity scores for all categories.

        Useful for debugging and understanding classification decisions.

        Args:
            message: The message text to classify

        Returns:
            Dictionary mapping category names to similarity scores
        """
        message_embedding = self.model.encode([message], show_progress_bar=False)[0]

        similarities = {}
        for category, category_embedding in self.category_embeddings.items():
            similarity = cosine_similarity(
                message_embedding.reshape(1, -1), category_embedding.reshape(1, -1)
            )[0][0]
            similarities[category] = float(similarity)

        return similarities

    def add_category_example(self, category: str, example: str) -> None:
        """
        Add a new example to a category and recompute its embedding.

        Args:
            category: Category name
            example: Example message to add

        Raises:
            KeyError: If category doesn't exist
        """
        if category not in self.category_examples:
            raise KeyError(f"Category '{category}' not found")

        self.category_examples[category].append(example)

        # Recompute embedding for this category
        embeddings = self.model.encode(
            self.category_examples[category], show_progress_bar=False
        )
        self.category_embeddings[category] = np.mean(embeddings, axis=0)

    def get_embedding(self, message: str) -> np.ndarray:
        """
        Get the embedding vector for a message.

        Useful for downstream tasks like grouping and deduplication.

        Args:
            message: The message text

        Returns:
            Numpy array of embedding vector
        """
        return self.model.encode([message], show_progress_bar=False)[0]
