"""
FastAPI server for processing Slack messages.

This server provides a simple endpoint to process messages through the
classification and grouping pipeline.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from fde_slackbot.classifier import MessageClassifier
from fde_slackbot.classifier.llm_classifier import LLMClassifier
from fde_slackbot.grouping import ConcernGrouper
from fde_slackbot.grouping.db import (
    get_slack_event_by_id,
    get_bug_event_by_id,
    reassign_all_messages_to_concern,
    get_concern_by_id
)
from fde_slackbot.settings import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FDE Slackbot API",
    description="Process Slack messages through classification and grouping pipeline",
    version="0.1.0",
)

# Add CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize classifier and grouper
# Note: We'll create these lazily based on settings to pick up provider changes
embedding_classifier = None
grouper = None


def get_embedding_classifier():
    """
    Get the embedding classifier based on current settings.

    Creates a fresh classifier to pick up embedding provider/model changes.
    Auto-corrects mismatched provider/model combinations.
    """
    settings = get_settings(use_cache=False)

    provider = settings.embedding_provider
    model = settings.embedding_model

    # Auto-correct mismatched provider/model combinations
    if provider == "openai" and ("MiniLM" in model or "mpnet" in model):
        logger.warning(
            f"Embedding model '{model}' is not compatible with OpenAI provider. "
            f"Using 'text-embedding-3-small' instead."
        )
        model = "text-embedding-3-small"
    elif provider == "sentence-transformers" and model.startswith("text-embedding"):
        logger.warning(
            f"Embedding model '{model}' is not compatible with sentence-transformers provider. "
            f"Using 'all-MiniLM-L6-v2' instead."
        )
        model = "all-MiniLM-L6-v2"

    return MessageClassifier(
        confidence_threshold=0.5,
        embedding_provider=provider,
        embedding_model=model
    )


def get_grouper():
    """
    Get the concern grouper with the current embedding classifier.
    """
    classifier = get_embedding_classifier()
    return ConcernGrouper(classifier=classifier)

logger.info("FDE Slackbot API initialized")


def get_classifier():
    """
    Get the appropriate classifier based on current settings.

    Returns the LLM or embedding classifier depending on settings.
    Creates fresh LLM classifier instance on each call to pick up
    settings changes (including custom context).
    """
    # Fetch settings fresh each time (no caching) for safety
    settings = get_settings(use_cache=False)

    if settings.classification_method == "llm":
        # Create fresh LLM classifier with current settings
        logger.info(f"Creating LLM classifier with model: {settings.llm_model}")
        if settings.llm_context:
            logger.info(f"Using custom context: {settings.llm_context[:100]}...")
        return LLMClassifier(
            model=settings.llm_model,
            custom_context=settings.llm_context
        )
    else:
        return get_embedding_classifier()


def should_filter_bot_message(user_id: str) -> bool:
    """
    Check if a message should be filtered based on bot name setting.

    Args:
        user_id: The user_id from the Slack message

    Returns:
        True if message should be filtered (is from bot), False otherwise
    """
    settings = get_settings()

    if not settings.bot_name:
        return False  # No bot filtering configured

    # Check if user_id matches bot_name
    return user_id == settings.bot_name


# Request/Response models
class ProcessMessageRequest(BaseModel):
    """Request to process a Slack message."""
    message_id: str = Field(..., description="UUID of the message in slack_events table")


class ProcessMessageResponse(BaseModel):
    """Response from processing a Slack message."""
    success: bool
    message_id: str
    category: str
    confidence: float
    is_relevant: bool
    concern_id: Optional[str] = None
    grouping_method: Optional[str] = None
    similarity_score: Optional[float] = None
    is_new_concern: Optional[bool] = None
    error: Optional[str] = None


class ProcessBugRequest(BaseModel):
    """Request to process a manually-entered bug."""
    bug_id: str = Field(..., description="UUID of the bug in bug_events table")


class ProcessBugResponse(BaseModel):
    """Response from processing a bug."""
    success: bool
    bug_id: str
    category: str  # Always "bug_report"
    concern_id: str
    grouping_method: str
    similarity_score: Optional[float] = None
    is_new_concern: bool
    error: Optional[str] = None


class ReassignMessagesRequest(BaseModel):
    """Request to reassign messages from one concern to another."""
    from_concern_id: str = Field(..., description="Source concern UUID")
    to_concern_id: str = Field(..., description="Target concern UUID")


class ReassignMessagesResponse(BaseModel):
    """Response from reassigning messages."""
    success: bool
    from_concern_id: str
    to_concern_id: str
    messages_moved_count: int
    bugs_moved_count: int
    error: Optional[str] = None


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "FDE Slackbot API",
        "status": "running",
        "version": "0.1.0"
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "classifier": "initialized",
        "grouper": "initialized"
    }


@app.post("/process", response_model=ProcessMessageResponse)
async def process_message(request: ProcessMessageRequest):
    """
    Process a Slack message through the classification and grouping pipeline.

    This endpoint:
    1. Fetches the message from slack_events table
    2. Filters bot messages based on settings
    3. Classifies it using LLM or embedding classifier (based on settings)
    4. If irrelevant, returns early (no grouping)
    5. Groups relevant messages using ConcernGrouper
    6. Returns the processing result

    Args:
        request: ProcessMessageRequest with message_id

    Returns:
        ProcessMessageResponse with classification and grouping results

    Raises:
        HTTPException: If message not found or processing fails
    """
    try:
        logger.info(f"Processing message: {request.message_id}")

        # Step 1: Fetch the slack_event from database
        slack_event = get_slack_event_by_id(request.message_id)

        if not slack_event:
            logger.warning(f"Message not found: {request.message_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Message {request.message_id} not found in slack_events table"
            )

        message_text = slack_event.get('message_text', '')
        if not message_text:
            logger.warning(f"Message has no text: {request.message_id}")
            raise HTTPException(
                status_code=400,
                detail="Message has no text content"
            )

        # Step 2: Check bot filtering
        user_id = slack_event.get('user_id', '')
        if should_filter_bot_message(user_id):
            logger.info(f"Filtering bot message from user: {user_id}")
            return ProcessMessageResponse(
                success=True,
                message_id=request.message_id,
                category="irrelevant",
                confidence=1.0,
                is_relevant=False
            )

        # Step 3: Classify the message using configured classifier
        current_classifier = get_classifier()
        classification = current_classifier.classify(message_text)

        logger.info(
            f"Classified message {request.message_id}: "
            f"category={classification.category}, "
            f"confidence={classification.confidence:.3f}, "
            f"is_relevant={classification.is_relevant}"
        )

        # Step 4: If irrelevant, return early (no grouping)
        if classification.category == "irrelevant":
            return ProcessMessageResponse(
                success=True,
                message_id=request.message_id,
                category=classification.category,
                confidence=classification.confidence,
                is_relevant=False
            )

        # Step 5: Group the message into a concern
        grouper = get_grouper()
        result = grouper.process_message(
            message_id=request.message_id,
            message_text=message_text,
            thread_ts=slack_event.get('thread_ts'),
            channel_id=slack_event.get('channel_id'),
            user_id=slack_event.get('user_id')
        )

        if result is None:
            # Grouper filtered it out (shouldn't happen if classifier said relevant)
            logger.warning(f"Grouper filtered out message {request.message_id}")
            return ProcessMessageResponse(
                success=True,
                message_id=request.message_id,
                category=classification.category,
                confidence=classification.confidence,
                is_relevant=False
            )

        logger.info(
            f"Grouped message {request.message_id}: "
            f"concern_id={result.concern_id}, "
            f"method={result.grouping_method}, "
            f"new_concern={result.is_new_concern}"
        )

        # Step 6: Return success response
        return ProcessMessageResponse(
            success=True,
            message_id=request.message_id,
            category=classification.category,
            confidence=classification.confidence,
            is_relevant=True,
            concern_id=str(result.concern_id),
            grouping_method=result.grouping_method,
            similarity_score=result.similarity_score,
            is_new_concern=result.is_new_concern
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error processing message {request.message_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error processing message: {str(e)}"
        )


@app.post("/process-bug", response_model=ProcessBugResponse)
async def process_bug(request: ProcessBugRequest):
    """
    Process a manually-entered bug through the semantic grouping pipeline.

    Bugs are ALWAYS relevant and ALWAYS categorized as "bug_report".
    Only the title is used for semantic grouping.

    This endpoint:
    1. Fetches the bug from bug_events table
    2. Groups it using ConcernGrouper (no classification needed)
    3. Returns the processing result

    Args:
        request: ProcessBugRequest with bug_id

    Returns:
        ProcessBugResponse with grouping results

    Raises:
        HTTPException: If bug not found or processing fails
    """
    try:
        logger.info(f"Processing bug: {request.bug_id}")

        # Step 1: Fetch the bug_event from database
        bug_event = get_bug_event_by_id(request.bug_id)

        if not bug_event:
            logger.warning(f"Bug not found: {request.bug_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Bug {request.bug_id} not found in bug_events table"
            )

        bug_title = bug_event.get('title', '')
        if not bug_title:
            logger.warning(f"Bug has no title: {request.bug_id}")
            raise HTTPException(
                status_code=400,
                detail="Bug has no title"
            )

        # Step 2: Process the bug (no classification - always bug_report)
        # Only use title for semantic grouping
        grouper = get_grouper()
        result = grouper.process_bug_event(
            bug_id=request.bug_id,
            bug_title=bug_title
        )

        logger.info(
            f"Processed bug {request.bug_id}: "
            f"concern_id={result.concern_id}, "
            f"method={result.grouping_method}, "
            f"new_concern={result.is_new_concern}"
        )

        # Step 3: Return success response
        return ProcessBugResponse(
            success=True,
            bug_id=request.bug_id,
            category="bug_report",  # Always bug_report
            concern_id=str(result.concern_id),
            grouping_method=result.grouping_method,
            similarity_score=result.similarity_score,
            is_new_concern=result.is_new_concern
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error processing bug {request.bug_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error processing bug: {str(e)}"
        )


@app.post("/reassign-messages", response_model=ReassignMessagesResponse)
async def reassign_messages(request: ReassignMessagesRequest):
    """
    Reassign all messages and bugs from one concern to another.

    This endpoint:
    1. Validates that both concerns exist
    2. Moves all concern_group records to the target concern
    3. Updates message_count and bug_count for both concerns
    4. Returns counts of items moved

    Args:
        request: ReassignMessagesRequest with from_concern_id and to_concern_id

    Returns:
        ReassignMessagesResponse with counts of messages and bugs moved

    Raises:
        HTTPException: If concerns not found or reassignment fails
    """
    try:
        logger.info(
            f"Reassigning messages from concern {request.from_concern_id} "
            f"to concern {request.to_concern_id}"
        )

        # Step 1: Validate both concerns exist
        from_concern = get_concern_by_id(UUID(request.from_concern_id))
        if not from_concern:
            logger.warning(f"Source concern not found: {request.from_concern_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Source concern {request.from_concern_id} not found"
            )

        to_concern = get_concern_by_id(UUID(request.to_concern_id))
        if not to_concern:
            logger.warning(f"Target concern not found: {request.to_concern_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Target concern {request.to_concern_id} not found"
            )

        # Step 2: Reassign all messages and bugs
        messages_moved, bugs_moved = reassign_all_messages_to_concern(
            from_concern_id=UUID(request.from_concern_id),
            to_concern_id=UUID(request.to_concern_id)
        )

        logger.info(
            f"Successfully reassigned {messages_moved} message(s) and "
            f"{bugs_moved} bug(s) from concern {request.from_concern_id} "
            f"to concern {request.to_concern_id}"
        )

        # Step 3: Return success response
        return ReassignMessagesResponse(
            success=True,
            from_concern_id=request.from_concern_id,
            to_concern_id=request.to_concern_id,
            messages_moved_count=messages_moved,
            bugs_moved_count=bugs_moved
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(
            f"Error reassigning messages from {request.from_concern_id} "
            f"to {request.to_concern_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Internal error reassigning messages: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
