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
from fde_slackbot.grouping import ConcernGrouper
from fde_slackbot.grouping.db import get_slack_event_by_id, get_bug_event_by_id

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

# Initialize classifier and grouper (reuse instances for performance)
classifier = MessageClassifier(confidence_threshold=0.5)
grouper = ConcernGrouper(classifier=classifier)

logger.info("FDE Slackbot API initialized")


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
    2. Classifies it using MessageClassifier
    3. If relevant, groups it using ConcernGrouper
    4. Returns the processing result

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

        # Step 2: Classify the message
        classification = classifier.classify(message_text)

        logger.info(
            f"Classified message {request.message_id}: "
            f"category={classification.category}, "
            f"confidence={classification.confidence:.3f}, "
            f"is_relevant={classification.is_relevant}"
        )

        # Step 3: If irrelevant, return early (no grouping)
        if classification.category == "irrelevant":
            return ProcessMessageResponse(
                success=True,
                message_id=request.message_id,
                category=classification.category,
                confidence=classification.confidence,
                is_relevant=False
            )

        # Step 4: Group the message into a concern
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

        # Step 5: Return success response
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
