"""
Helper functions for concern grouping.

Includes utilities for centroid updates, title generation, and text hashing.
"""

import hashlib
import json
import numpy as np
from datetime import datetime, timezone
from typing import List, Tuple

from fde_slackbot.grouping.config import MAX_TITLE_LENGTH, TEMPORAL_DECAY_LAMBDA


def compute_text_hash(text: str) -> str:
    """
    Compute SHA-256 hash of text for exact duplicate detection.

    Args:
        text: The message text to hash

    Returns:
        Hexadecimal string of SHA-256 hash

    Examples:
        >>> compute_text_hash("hello world")
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
    """
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def update_centroid(
    old_centroid: List[float],
    new_embedding: np.ndarray,
    current_count: int
) -> List[float]:
    """
    Incrementally update concern centroid using running average.

    Formula: new_centroid = (old_centroid * n + new_embedding) / (n + 1)

    This allows updating the centroid without storing all individual embeddings.

    Args:
        old_centroid: Current centroid embedding as list
        new_embedding: New message embedding to incorporate
        current_count: Current number of messages in the concern

    Returns:
        Updated centroid embedding as list

    Examples:
        >>> old = [0.5, 0.5, 0.5]
        >>> new = np.array([1.0, 1.0, 1.0])
        >>> update_centroid(old, new, 1)
        [0.75, 0.75, 0.75]
    """
    old_centroid_array = np.array(old_centroid)
    new_centroid = (old_centroid_array * current_count + new_embedding) / (current_count + 1)
    return new_centroid.tolist()


def generate_title(message_text: str, max_length: int = MAX_TITLE_LENGTH) -> str:
    """
    Generate a concern title from message text.

    Takes the first sentence or truncates to max_length characters.

    Args:
        message_text: The message text to generate title from
        max_length: Maximum title length (default: 100)

    Returns:
        Generated title string

    Examples:
        >>> generate_title("The login button doesn't work. I tried multiple times.")
        "The login button doesn't work"

        >>> generate_title("A" * 200)
        'AAA...AAA...'  # Truncated to 100 chars
    """
    # Clean up whitespace
    text = " ".join(message_text.strip().split())

    # Try to get first sentence
    sentences = text.split('.')
    if sentences:
        title = sentences[0].strip()
    else:
        title = text

    # Truncate if too long
    if len(title) > max_length:
        title = title[:max_length].strip() + "..."

    # Ensure title is not empty
    if not title:
        title = "Untitled concern"

    return title


def apply_temporal_decay(
    similarity: float,
    concern_created_at: datetime,
    current_time: datetime,
    decay_lambda: float = TEMPORAL_DECAY_LAMBDA
) -> float:
    """
    Apply exponential temporal decay to similarity score.

    Recent concerns are weighted more heavily than old ones.

    Formula: decayed_similarity = similarity * exp(-λ * days_old)

    Args:
        similarity: Original cosine similarity score (0.0-1.0)
        concern_created_at: When the concern was created
        current_time: Current timestamp
        decay_lambda: Decay rate parameter (default: 0.05)

    Returns:
        Decayed similarity score

    Examples:
        >>> from datetime import timedelta
        >>> now = datetime.now(timezone.utc)
        >>> week_ago = now - timedelta(days=7)
        >>> apply_temporal_decay(0.9, week_ago, now, 0.05)
        0.628...  # ~70% of original due to decay
    """
    # Handle timezone-aware/naive datetime
    if concern_created_at.tzinfo is None:
        concern_created_at = concern_created_at.replace(tzinfo=timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    # Calculate age in days
    age_delta = current_time - concern_created_at
    days_old = age_delta.total_seconds() / 86400  # seconds per day

    # Apply exponential decay
    decay_factor = np.exp(-decay_lambda * days_old)
    decayed_similarity = similarity * decay_factor

    return float(decayed_similarity)


def calculate_cosine_similarity(
    embedding1: np.ndarray,
    embedding2: np.ndarray
) -> float:
    """
    Calculate cosine similarity between two embeddings.

    Args:
        embedding1: First embedding vector
        embedding2: Second embedding vector

    Returns:
        Cosine similarity score (0.0-1.0)

    Examples:
        >>> vec1 = np.array([1.0, 0.0, 0.0])
        >>> vec2 = np.array([1.0, 0.0, 0.0])
        >>> calculate_cosine_similarity(vec1, vec2)
        1.0

        >>> vec3 = np.array([0.0, 1.0, 0.0])
        >>> calculate_cosine_similarity(vec1, vec3)
        0.0
    """
    # Reshape to 2D arrays if needed
    if embedding1.ndim == 1:
        embedding1 = embedding1.reshape(1, -1)
    if embedding2.ndim == 1:
        embedding2 = embedding2.reshape(1, -1)

    # Calculate dot product
    dot_product = np.dot(embedding1, embedding2.T)[0][0]

    # Calculate norms
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)

    # Avoid division by zero
    if norm1 == 0 or norm2 == 0:
        return 0.0

    # Cosine similarity
    similarity = dot_product / (norm1 * norm2)

    # Ensure result is in [0, 1] range (can have floating point errors)
    return float(max(0.0, min(1.0, similarity)))


def embedding_to_json(embedding: np.ndarray) -> str:
    """
    Convert numpy embedding array to JSON string for database storage.

    Args:
        embedding: Numpy array embedding vector

    Returns:
        JSON string representation

    Examples:
        >>> arr = np.array([0.1, 0.2, 0.3])
        >>> embedding_to_json(arr)
        '[0.1, 0.2, 0.3]'
    """
    return json.dumps(embedding.tolist())


def embedding_from_json(json_str: str) -> np.ndarray:
    """
    Convert JSON string back to numpy embedding array.

    Args:
        json_str: JSON string representation of embedding

    Returns:
        Numpy array embedding vector

    Examples:
        >>> embedding_from_json('[0.1, 0.2, 0.3]')
        array([0.1, 0.2, 0.3])
    """
    return np.array(json.loads(json_str))
