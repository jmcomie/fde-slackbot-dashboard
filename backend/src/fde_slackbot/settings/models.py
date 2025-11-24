"""
Pydantic models for application settings.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field
from uuid import UUID


ClassificationMethod = Literal["embedding", "llm"]


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

    grouping_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence-transformers model for semantic grouping"
    )

    class Config:
        """Pydantic config."""
        from_attributes = True  # Allow conversion from ORM models
