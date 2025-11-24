"""
Pydantic models for application settings.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field
from uuid import UUID


ClassificationMethod = Literal["embedding", "llm"]
EmbeddingProvider = Literal["sentence-transformers", "openai"]


class Settings(BaseModel):
    """
    Application-wide settings model.

    This represents the single settings row from the database.
    """

    id: UUID = Field(
        default=UUID("00000000-0000-0000-0000-000000000001"),
        description="Fixed UUID for singleton settings row"
    )

    bot_name: Optional[str] = Field(
        default=None,
        description="Bot user ID or name to filter from processing"
    )

    classification_method: ClassificationMethod = Field(
        default="llm",
        description="Method for classifying messages: 'embedding' or 'llm'"
    )

    llm_model: str = Field(
        default="gpt-4o-mini",
        description="OpenAI model name for LLM classification"
    )

    llm_context: Optional[str] = Field(
        default=None,
        description="Optional custom context for LLM classification prompt"
    )

    embedding_provider: EmbeddingProvider = Field(
        default="sentence-transformers",
        description="Provider for semantic grouping embeddings: 'sentence-transformers' (local, free) or 'openai' (API, paid)"
    )

    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Model name for embeddings (provider-specific)"
    )

    grouping_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="DEPRECATED: Use embedding_model instead. Kept for backward compatibility."
    )

    class Config:
        """Pydantic config."""
        from_attributes = True  # Allow conversion from ORM models
