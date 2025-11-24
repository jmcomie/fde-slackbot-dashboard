"""
Main concern grouping logic.

Implements the 5-level hierarchical algorithm for semantic message grouping.
"""

import numpy as np
from datetime import datetime, timezone
from typing import Optional, Tuple
from uuid import UUID

from fde_slackbot.classifier import MessageClassifier
from fde_slackbot.classifier.models import ClassificationResult
from fde_slackbot.grouping.models import (
    GroupingResult,
    ConcernCreate,
    ConcernGroupCreate,
)
from fde_slackbot.grouping.db import (
    create_concern,
    create_concern_group,
    get_active_concerns_by_category,
    get_concern_by_id,
    update_concern_centroid_and_count,
    get_slack_event_by_id,
)
from fde_slackbot.grouping.helpers import (
    apply_temporal_decay,
    calculate_cosine_similarity,
    compute_text_hash,
    embedding_from_json,
    embedding_to_json,
    generate_title,
    update_centroid,
)
from fde_slackbot.grouping.config import (
    HIGH_CONFIDENCE_THRESHOLD,
    MEDIUM_CONFIDENCE_THRESHOLD,
    GROUPING_METHODS,
)
from fde_slackbot.lib.supabase_client import get_supabase_client


class ConcernGrouper:
    """
    Main class for grouping messages into concerns.

    Implements a 5-level hierarchical decision algorithm:
    1. Thread-based grouping (same thread_ts)
    2. Exact duplicate detection (text hash matching)
    3. Cosine similarity search (semantic matching)
    4. Category consistency check
    5. Temporal decay (weight recent concerns higher)
    """

    def __init__(self, classifier: Optional[MessageClassifier] = None):
        """
        Initialize the concern grouper.

        Args:
            classifier: Optional MessageClassifier instance.
                       If None, creates a new one with lower threshold.
        """
        # Use classifier with lower confidence threshold (0.5 instead of default 0.7)
        # This allows us to capture more relevant messages for grouping
        self.classifier = classifier or MessageClassifier(confidence_threshold=0.5)

    def process_message(
        self,
        message_id: str,
        message_text: str,
        thread_ts: Optional[str] = None,
        channel_id: Optional[str] = None,
        user_id: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ) -> Optional[GroupingResult]:
        """
        Process a message and assign it to a concern.

        This is the main public API method.

        Args:
            message_id: ID of the message (from slack_events.id)
            message_text: The message text
            thread_ts: Slack thread timestamp (if in a thread)
            channel_id: Slack channel ID
            user_id: Slack user ID
            timestamp: Message timestamp (default: now)

        Returns:
            GroupingResult if message is relevant, None if irrelevant

        Examples:
            >>> grouper = ConcernGrouper()
            >>> result = grouper.process_message(
            ...     message_id="123",
            ...     message_text="The login button doesn't work",
            ...     channel_id="C456"
            ... )
            >>> print(result.grouping_method)
            'new_concern'
        """
        # Set default timestamp
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # Step 1: Classify message
        classification = self.classifier.classify(message_text)

        # Skip if explicitly irrelevant
        # Note: We process messages even with low confidence if they're categorized
        # as bug_report, feature_request, etc. (not "irrelevant")
        if classification.category == "irrelevant":
            return None

        # Step 2: Generate embedding
        message_embedding = self.classifier.get_embedding(message_text)

        # Step 3: Find or create concern
        concern_id, grouping_method, similarity_score = self._find_or_create_concern(
            message_id=message_id,
            message_text=message_text,
            message_embedding=message_embedding,
            category=classification.category,
            thread_ts=thread_ts,
            channel_id=channel_id,
            timestamp=timestamp
        )

        # Step 4: Create concern_group mapping
        confidence = GROUPING_METHODS.get(grouping_method, "medium")
        create_concern_group(ConcernGroupCreate(
            concern_id=concern_id,
            foreign_table="slack_event",
            foreign_identifier=message_id,
            similarity_score=similarity_score,
            grouping_method=grouping_method,
            confidence=confidence
        ))

        # Return result
        is_new = grouping_method in ["new_concern", "low_similarity"]
        return GroupingResult(
            concern_id=concern_id,
            grouping_method=grouping_method,
            similarity_score=similarity_score,
            confidence=confidence,
            is_new_concern=is_new
        )

    def _find_or_create_concern(
        self,
        message_id: str,
        message_text: str,
        message_embedding: np.ndarray,
        category: str,
        thread_ts: Optional[str],
        channel_id: Optional[str],
        timestamp: datetime
    ) -> Tuple[UUID, str, Optional[float]]:
        """
        5-Level Hierarchical Grouping Decision Logic.

        Returns: (concern_id, grouping_method, similarity_score)
        """
        # ===== LEVEL 1: Thread-based Grouping =====
        if thread_ts and channel_id:
            existing_concern = self._find_concern_by_thread(thread_ts, channel_id)
            if existing_concern:
                # Update centroid with new message
                new_centroid = update_centroid(
                    existing_concern.centroid_embedding,
                    message_embedding,
                    existing_concern.message_count
                )
                update_concern_centroid_and_count(
                    existing_concern.id,
                    new_centroid,
                    existing_concern.message_count + 1
                )
                return (existing_concern.id, "thread_match", None)

        # ===== LEVEL 2: Exact Duplicate Detection =====
        # text_hash = compute_text_hash(message_text)
        # existing_concern = find_concern_by_text_hash(text_hash, category)
        # if existing_concern:
        #     return (existing_concern.id, "exact_duplicate", 1.0)
        # TODO: Implement text hash storage for faster exact duplicate detection

        # ===== LEVEL 3: Cosine Similarity Search =====
        candidate_concerns = get_active_concerns_by_category(category=category)

        if not candidate_concerns:
            # No existing concerns, create new one
            new_concern_id = self._create_new_concern(
                category=category,
                centroid_embedding=message_embedding,
                title=generate_title(message_text),
                grouping_method="new_concern"
            )
            return (new_concern_id, "new_concern", None)

        # Compute similarities with temporal decay
        similarities = []
        for concern in candidate_concerns:
            # Convert concern centroid to numpy array
            concern_centroid = np.array(concern.centroid_embedding)

            # Calculate raw similarity
            similarity = calculate_cosine_similarity(
                message_embedding,
                concern_centroid
            )

            # Apply temporal decay
            decayed_similarity = apply_temporal_decay(
                similarity,
                concern.first_seen,
                timestamp
            )

            similarities.append({
                'concern_id': concern.id,
                'raw_similarity': similarity,
                'decayed_similarity': decayed_similarity,
                'days_old': (timestamp - concern.first_seen).days
            })

        # Sort by decayed similarity
        similarities.sort(key=lambda x: x['decayed_similarity'], reverse=True)
        best_match = similarities[0]

        # ===== LEVEL 4: Threshold-based Decision =====
        if best_match['decayed_similarity'] >= HIGH_CONFIDENCE_THRESHOLD:
            # High confidence match - auto-group
            concern_id = best_match['concern_id']
            concern = get_concern_by_id(concern_id)

            # Update centroid
            new_centroid = update_centroid(
                concern.centroid_embedding,
                message_embedding,
                concern.message_count
            )
            update_concern_centroid_and_count(
                concern_id,
                new_centroid,
                concern.message_count + 1
            )

            return (concern_id, "cosine_high_conf", best_match['raw_similarity'])

        elif best_match['decayed_similarity'] >= MEDIUM_CONFIDENCE_THRESHOLD:
            # Medium confidence - still auto-group but mark as medium confidence
            concern_id = best_match['concern_id']
            concern = get_concern_by_id(concern_id)

            # Update centroid
            new_centroid = update_centroid(
                concern.centroid_embedding,
                message_embedding,
                concern.message_count
            )
            update_concern_centroid_and_count(
                concern_id,
                new_centroid,
                concern.message_count + 1
            )

            return (concern_id, "cosine_medium_conf", best_match['raw_similarity'])

        else:
            # Low similarity - create new concern
            new_concern_id = self._create_new_concern(
                category=category,
                centroid_embedding=message_embedding,
                title=generate_title(message_text),
                grouping_method="low_similarity"
            )
            return (new_concern_id, "low_similarity", best_match['raw_similarity'])

    def _find_concern_by_thread(
        self,
        thread_ts: str,
        channel_id: str
    ) -> Optional[object]:
        """
        Find a concern containing messages from a specific thread.

        Simplified implementation using direct queries.

        Args:
            thread_ts: Slack thread timestamp
            channel_id: Slack channel ID

        Returns:
            Concern object if found, None otherwise
        """
        supabase = get_supabase_client()

        # Find slack_events with this thread_ts
        events_response = (
            supabase.table('slack_events')
            .select('id')
            .eq('thread_ts', thread_ts)
            .eq('channel_id', channel_id)
            .limit(1)
            .execute()
        )

        if not events_response.data:
            return None

        event_id = events_response.data[0]['id']

        # Find concern_group for this event
        cg_response = (
            supabase.table('concern_group')
            .select('concern_id')
            .eq('foreign_table', 'slack_event')
            .eq('foreign_identifier', str(event_id))
            .limit(1)
            .execute()
        )

        if not cg_response.data:
            return None

        concern_id = UUID(cg_response.data[0]['concern_id'])
        return get_concern_by_id(concern_id)

    def _create_new_concern(
        self,
        category: str,
        centroid_embedding: np.ndarray,
        title: str,
        grouping_method: str
    ) -> UUID:
        """
        Create a new concern.

        Args:
            category: Concern category
            centroid_embedding: Initial centroid (first message embedding)
            title: Concern title
            grouping_method: How this concern was created

        Returns:
            UUID of the created concern
        """
        concern_data = ConcernCreate(
            category=category,
            centroid_embedding=centroid_embedding.tolist(),
            title=title,
            grouping_method=grouping_method
        )

        return create_concern(concern_data)
