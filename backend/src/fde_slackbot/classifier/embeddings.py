"""
Embedding-based message classification using Sentence Transformers or OpenAI.

Uses lightweight sentence transformers or OpenAI embeddings to convert messages
to embeddings and classify them based on cosine similarity to category examples.
"""

from typing import Dict, Optional
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from openai import OpenAI

from fde_slackbot.classifier.config import (
    EMBEDDING_MODEL_NAME,
    EMBEDDING_SIMILARITY_THRESHOLD,
    get_all_category_examples,
)
from fde_slackbot.classifier.models import MessageCategory


def get_openai_embedding(text: str, model: str = "text-embedding-3-small") -> np.ndarray:
    """
    Get embedding vector from OpenAI API.

    Args:
        text: Text to embed
        model: OpenAI embedding model name

    Returns:
        Numpy array of embedding vector (normalized to unit length)

    Raises:
        ValueError: If OPENAI_API_KEY not set
        Exception: If OpenAI API call fails
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY environment variable not set. "
            "Required for OpenAI embedding provider."
        )

    try:
        client = OpenAI(api_key=api_key)
        response = client.embeddings.create(
            model=model,
            input=text
        )

        # Extract embedding and convert to numpy array
        embedding = np.array(response.data[0].embedding, dtype=np.float32)

        # Normalize to unit length (same as sentence-transformers)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding

    except Exception as e:
        raise Exception(f"OpenAI embedding API call failed: {e}")


class EmbeddingClassifier:
    """
    Embedding-based classifier for message categorization.

    Uses Sentence Transformers or OpenAI to convert messages to vector embeddings
    and classifies them based on cosine similarity to pre-computed
    category centroid embeddings.

    Supports two providers:
    - sentence-transformers: Local, free, fast (~20-50ms per message on CPU)
    - openai: API-based, paid, higher quality embeddings
    """

    def __init__(
        self,
        provider: str = "sentence-transformers",
        model_name: str = EMBEDDING_MODEL_NAME,
        similarity_threshold: float = EMBEDDING_SIMILARITY_THRESHOLD,
        category_examples: Optional[Dict[str, list[str]]] = None,
    ):
        """
        Initialize the embedding classifier.

        Args:
            provider: Embedding provider - "sentence-transformers" or "openai"
            model_name: Name of the model to use (provider-specific):
                       - sentence-transformers: "all-MiniLM-L6-v2" (384d), "all-mpnet-base-v2" (768d)
                       - openai: "text-embedding-3-small" (1536d), "text-embedding-3-large" (3072d)
            similarity_threshold: Minimum cosine similarity to assign category (default: 0.7)
            category_examples: Optional custom category examples
        """
        self.provider = provider
        self.model_name = model_name
        self.similarity_threshold = similarity_threshold

        # Load the appropriate model based on provider
        if provider == "sentence-transformers":
            # Load sentence transformer model (cached after first load)
            self.model = SentenceTransformer(model_name)
        elif provider == "openai":
            # OpenAI embeddings are fetched via API, no local model to load
            self.model = None
        else:
            raise ValueError(f"Unknown embedding provider: {provider}. Must be 'sentence-transformers' or 'openai'")

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
            if self.provider == "sentence-transformers":
                # Encode all examples using sentence transformers
                embeddings = self.model.encode(examples, show_progress_bar=False)
            elif self.provider == "openai":
                # Encode all examples using OpenAI API
                embeddings = np.array([
                    get_openai_embedding(example, self.model_name)
                    for example in examples
                ])
            else:
                raise ValueError(f"Unknown provider: {self.provider}")

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
        # Generate embedding for the message based on provider
        if self.provider == "sentence-transformers":
            message_embedding = self.model.encode([message], show_progress_bar=False)[0]
        elif self.provider == "openai":
            message_embedding = get_openai_embedding(message, self.model_name)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

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
        if self.provider == "sentence-transformers":
            return self.model.encode([message], show_progress_bar=False)[0]
        elif self.provider == "openai":
            return get_openai_embedding(message, self.model_name)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")
