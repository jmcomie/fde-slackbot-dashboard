"""
Pydantic models for concern grouping.
"""

from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from uuid import UUID

# Type definitions
ConcernCategory = Literal["bug_report", "feature_request", "support_question", "general_question"]
ConcernStatus = Literal["open", "in_progress", "resolved", "closed"]
ConcernPriority = Literal["high", "medium", "low"]
GroupingMethod = Literal[
    "new_concern",
    "thread_match",
    "cosine_high_conf",
    "cosine_medium_conf",
    "low_similarity",
    "exact_duplicate",
    "manual",
    "initial"
]
Confidence = Literal["high", "medium", "low"]


class Concern(BaseModel):
    """
    Represents a conceptual issue or topic grouping related messages.

    Each concern corresponds to one item displayed on the dashboard.
    """
    id: UUID
    category: ConcernCategory
    centroid_embedding: List[float] = Field(description="384-dimensional embedding vector")
    title: str = Field(max_length=200)
    summary: Optional[str] = None
    message_count: int = Field(ge=1, default=1)
    status: ConcernStatus = "open"
    priority: Optional[ConcernPriority] = None
    first_seen: datetime
    last_updated: datetime
    grouping_method: GroupingMethod
    created_at: datetime

    class Config:
        from_attributes = True


class ConcernCreate(BaseModel):
    """Model for creating a new concern."""
    category: ConcernCategory
    centroid_embedding: List[float]
    title: str
    summary: Optional[str] = None
    message_count: int = 1
    status: ConcernStatus = "open"
    priority: Optional[ConcernPriority] = None
    grouping_method: GroupingMethod


class ConcernGroup(BaseModel):
    """
    Represents a mapping between a message and a concern.

    Uses polymorphic pattern to support multiple message sources.
    """
    id: UUID
    concern_id: UUID
    foreign_table: str = Field(description="Source table name (e.g., 'slack_event')")
    foreign_identifier: str = Field(description="ID from the foreign table")
    similarity_score: Optional[float] = Field(ge=0.0, le=1.0, default=None)
    grouping_method: GroupingMethod
    confidence: Confidence
    grouped_at: datetime

    class Config:
        from_attributes = True


class ConcernGroupCreate(BaseModel):
    """Model for creating a new concern group mapping."""
    concern_id: UUID
    foreign_table: str
    foreign_identifier: str
    similarity_score: Optional[float] = None
    grouping_method: GroupingMethod
    confidence: Confidence


class GroupingResult(BaseModel):
    """
    Result of message grouping operation.

    Contains the concern ID and metadata about how the grouping was performed.
    """
    concern_id: UUID
    grouping_method: GroupingMethod
    similarity_score: Optional[float] = None
    confidence: Confidence
    is_new_concern: bool = False

    def __str__(self) -> str:
        if self.is_new_concern:
            return f"GroupingResult(new concern={self.concern_id}, method={self.grouping_method})"
        else:
            score_str = f", similarity={self.similarity_score:.3f}" if self.similarity_score else ""
            return f"GroupingResult(concern={self.concern_id}, method={self.grouping_method}{score_str})"


class ConcernWithMessages(Concern):
    """
    Extended concern model that includes related messages.

    Used for API responses that need to show all messages in a concern.
    """
    messages: List[dict] = Field(default_factory=list, description="Related messages from slack_events")
