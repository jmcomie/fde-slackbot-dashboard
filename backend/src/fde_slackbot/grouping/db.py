"""
Database operations for concern grouping.

Handles all Supabase queries for concern and concern_group tables.
"""

import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID

from fde_slackbot.lib.supabase_client import get_supabase_client
from fde_slackbot.grouping.models import (
    Concern,
    ConcernCreate,
    ConcernGroup,
    ConcernGroupCreate,
)
from fde_slackbot.grouping.config import MAX_CONCERN_AGE_DAYS


def create_concern(concern_data: ConcernCreate) -> UUID:
    """
    Create a new concern in the database.

    Args:
        concern_data: Concern creation data

    Returns:
        UUID of the created concern

    Raises:
        Exception: If database operation fails
    """
    # Use service role to bypass RLS for INSERT operations
    supabase = get_supabase_client(use_secret_key=True)

    # Convert embedding list to JSONB
    data = concern_data.model_dump()
    data['centroid_embedding'] = json.dumps(data['centroid_embedding'])
    data['first_seen'] = datetime.now(timezone.utc).isoformat()
    data['last_updated'] = datetime.now(timezone.utc).isoformat()

    response = supabase.table('concern').insert(data).execute()

    if not response.data:
        raise Exception("Failed to create concern")

    return UUID(response.data[0]['id'])


def get_concern_by_id(concern_id: UUID) -> Optional[Concern]:
    """
    Fetch a concern by its ID.

    Args:
        concern_id: UUID of the concern

    Returns:
        Concern object if found, None otherwise
    """
    supabase = get_supabase_client()

    response = supabase.table('concern').select('*').eq('id', str(concern_id)).execute()

    if not response.data:
        return None

    # Parse centroid_embedding from JSONB
    concern_data = response.data[0]
    if isinstance(concern_data['centroid_embedding'], str):
        concern_data['centroid_embedding'] = json.loads(concern_data['centroid_embedding'])

    return Concern(**concern_data)


def get_active_concerns_by_category(
    category: str,
    status: str = "open",
    max_age_days: int = MAX_CONCERN_AGE_DAYS
) -> List[Concern]:
    """
    Get all active concerns for a specific category.

    Args:
        category: Concern category (bug_report, feature_request, etc.)
        status: Concern status (default: "open")
        max_age_days: Maximum age in days to consider (default: 30)

    Returns:
        List of Concern objects
    """
    supabase = get_supabase_client()

    # Calculate cutoff date
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=max_age_days)

    response = (
        supabase.table('concern')
        .select('*')
        .eq('category', category)
        .eq('status', status)
        .gte('first_seen', cutoff_date.isoformat())
        .order('last_updated', desc=True)
        .execute()
    )

    concerns = []
    for concern_data in response.data:
        # Parse centroid_embedding from JSONB
        if isinstance(concern_data['centroid_embedding'], str):
            concern_data['centroid_embedding'] = json.loads(concern_data['centroid_embedding'])
        concerns.append(Concern(**concern_data))

    return concerns


def update_concern_centroid_and_count(
    concern_id: UUID,
    new_centroid: List[float],
    new_count: int,
    new_bug_count: Optional[int] = None
) -> None:
    """
    Update a concern's centroid embedding and message/bug counts.

    Args:
        concern_id: UUID of the concern
        new_centroid: Updated centroid embedding
        new_count: Updated message count
        new_bug_count: Updated bug count (optional, only updated if provided)
    """
    # Use service role to bypass RLS for UPDATE operations
    supabase = get_supabase_client(use_secret_key=True)

    update_data = {
        'centroid_embedding': json.dumps(new_centroid),
        'message_count': new_count,
        'last_updated': datetime.now(timezone.utc).isoformat()
    }

    if new_bug_count is not None:
        update_data['bug_count'] = new_bug_count

    supabase.table('concern').update(update_data).eq('id', str(concern_id)).execute()


def find_concern_by_thread(thread_ts: str, channel_id: str) -> Optional[Concern]:
    """
    Find a concern that contains messages from a specific thread.

    Optimized to use the is_parent index for faster lookups.

    Args:
        thread_ts: Slack thread timestamp
        channel_id: Slack channel ID

    Returns:
        Concern object if found, None otherwise
    """
    supabase = get_supabase_client()

    # Query for concern_group entries that reference this thread
    # Join with slack_events to filter by thread_ts
    response = supabase.rpc('find_concern_by_thread', {
        'p_thread_ts': thread_ts,
        'p_channel_id': channel_id
    }).execute()

    if not response.data or len(response.data) == 0:
        return None

    concern_id = response.data[0]['concern_id']
    return get_concern_by_id(UUID(concern_id))


def find_concern_by_text_hash(text_hash: str, category: str) -> Optional[Concern]:
    """
    Find a concern containing a message with the exact same text hash.

    Args:
        text_hash: SHA-256 hash of the message text
        category: Message category to filter by

    Returns:
        Concern object if found, None otherwise
    """
    supabase = get_supabase_client()

    # This would require storing text hashes in slack_events or concern_group
    # For MVP, we'll skip this optimization and rely on similarity matching
    # TODO: Add text_hash column to slack_events for faster exact duplicate detection
    return None


def create_concern_group(group_data: ConcernGroupCreate) -> UUID:
    """
    Create a new concern_group mapping.

    Args:
        group_data: Concern group creation data

    Returns:
        UUID of the created concern_group

    Raises:
        Exception: If database operation fails
    """
    # Use service role to bypass RLS for INSERT operations
    supabase = get_supabase_client(use_secret_key=True)

    data = group_data.model_dump()
    data['concern_id'] = str(data['concern_id'])
    data['grouped_at'] = datetime.now(timezone.utc).isoformat()

    response = supabase.table('concern_group').insert(data).execute()

    if not response.data:
        raise Exception("Failed to create concern_group")

    return UUID(response.data[0]['id'])


def get_messages_for_concern(concern_id: UUID) -> List[dict]:
    """
    Get all messages grouped under a specific concern.

    Args:
        concern_id: UUID of the concern

    Returns:
        List of message dictionaries from slack_events
    """
    supabase = get_supabase_client()

    # Get all concern_group mappings for this concern
    cg_response = (
        supabase.table('concern_group')
        .select('foreign_identifier')
        .eq('concern_id', str(concern_id))
        .eq('foreign_table', 'slack_event')
        .execute()
    )

    if not cg_response.data:
        return []

    # Get message UUIDs (convert string to proper format)
    message_ids = [cg['foreign_identifier'] for cg in cg_response.data]

    # Fetch messages from slack_events using proper UUID filtering
    messages_response = (
        supabase.table('slack_events')
        .select('*')
        .filter('id', 'in', f"({','.join(message_ids)})")
        .order('created_at', desc=False)
        .execute()
    )

    return messages_response.data if messages_response.data else []


def get_all_concerns(
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
) -> List[Concern]:
    """
    Get all concerns with optional filtering.

    Args:
        category: Filter by category (optional)
        status: Filter by status (optional)
        limit: Maximum number of concerns to return

    Returns:
        List of Concern objects
    """
    supabase = get_supabase_client()

    query = supabase.table('concern').select('*')

    if category:
        query = query.eq('category', category)
    if status:
        query = query.eq('status', status)

    response = query.order('last_updated', desc=True).limit(limit).execute()

    concerns = []
    for concern_data in response.data:
        # Parse centroid_embedding from JSONB
        if isinstance(concern_data['centroid_embedding'], str):
            concern_data['centroid_embedding'] = json.loads(concern_data['centroid_embedding'])
        concerns.append(Concern(**concern_data))

    return concerns


def get_slack_event_by_id(event_id: str) -> Optional[dict]:
    """
    Fetch a slack_event by its ID.

    Args:
        event_id: UUID string of the slack_event

    Returns:
        Slack event dictionary if found, None otherwise
    """
    supabase = get_supabase_client()

    response = supabase.table('slack_events').select('*').eq('id', event_id).execute()

    if not response.data:
        return None

    return response.data[0]


def get_bug_event_by_id(event_id: str) -> Optional[dict]:
    """
    Fetch a bug_event by its ID.

    Args:
        event_id: UUID string of the bug_event

    Returns:
        Bug event dictionary if found, None otherwise
    """
    supabase = get_supabase_client()

    response = supabase.table('bug_events').select('*').eq('id', event_id).execute()

    if not response.data:
        return None

    return response.data[0]


def reassign_all_messages_to_concern(
    from_concern_id: UUID,
    to_concern_id: UUID
) -> Tuple[int, int]:
    """
    Reassign all messages and bugs from one concern to another.

    This function:
    1. Moves all concern_group records to point to the new concern
    2. Updates message_count and bug_count for target concern
    3. Deletes the source concern (since it will be empty)
    4. Returns counts of messages and bugs moved

    Args:
        from_concern_id: Source concern UUID
        to_concern_id: Target concern UUID

    Returns:
        Tuple of (messages_moved_count, bugs_moved_count)

    Raises:
        Exception: If database operation fails
    """
    # Use service role to bypass RLS for UPDATE/DELETE operations
    supabase = get_supabase_client(use_secret_key=True)

    # Step 1: Get all concern_group records for the source concern
    cg_response = (
        supabase.table('concern_group')
        .select('*')
        .eq('concern_id', str(from_concern_id))
        .execute()
    )

    if not cg_response.data:
        return (0, 0)

    # Count messages vs bugs
    messages_count = sum(1 for cg in cg_response.data if cg['foreign_table'] == 'slack_event')
    bugs_count = sum(1 for cg in cg_response.data if cg['foreign_table'] == 'bug_event')

    # Step 2: Update all concern_group records to point to new concern
    supabase.table('concern_group').update({
        'concern_id': str(to_concern_id),
        'grouped_at': datetime.now(timezone.utc).isoformat()
    }).eq('concern_id', str(from_concern_id)).execute()

    # Step 3: Update message_count and bug_count for target concern (add)
    target_concern = get_concern_by_id(to_concern_id)
    if target_concern:
        new_message_count = target_concern.message_count + messages_count
        new_bug_count = target_concern.bug_count + bugs_count
        supabase.table('concern').update({
            'message_count': new_message_count,
            'bug_count': new_bug_count,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }).eq('id', str(to_concern_id)).execute()

    # Step 4: Delete the source concern (it's now empty and would violate the constraint)
    # Note: concern_group records have already been moved, so this is safe
    supabase.table('concern').delete().eq('id', str(from_concern_id)).execute()

    return (messages_count, bugs_count)
