"""
Pydantic models for message classification results.
"""

from typing import Literal
from pydantic import BaseModel, Field


MessageCategory = Literal[
    "bug_report",
    "feature_request",
    "support_question",
    "general_question",
    "irrelevant",
]

ClassificationMethod = Literal["regex", "length_filter", "embedding", "embedding_low_conf"]


class ClassificationResult(BaseModel):
    """
    Result of message classification.

    Attributes:
        category: The classified category of the message
        confidence: Confidence score between 0.0 and 1.0
        is_relevant: Whether the message is relevant to FDEs (not casual/irrelevant)
        method: Which classification method was used
    """

    category: MessageCategory = Field(
        description="The classified category of the message"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    is_relevant: bool = Field(
        description="Whether the message is relevant to FDEs"
    )
    method: ClassificationMethod = Field(
        description="Which classification method was used"
    )

    @property
    def is_high_confidence(self) -> bool:
        """Check if classification has high confidence (>= 0.7)"""
        return self.confidence >= 0.7

    def __str__(self) -> str:
        relevance = "relevant" if self.is_relevant else "irrelevant"
        return (
            f"ClassificationResult(category={self.category}, "
            f"confidence={self.confidence:.2f}, "
            f"{relevance}, "
            f"method={self.method})"
        )
