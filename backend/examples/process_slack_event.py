#!/usr/bin/env python3
"""
Example: Process a Slack event and group it into concerns.

This demonstrates how to integrate the concern grouping system
into your Slack event handler.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from fde_slackbot.grouping import ConcernGrouper


def process_slack_event(event: dict) -> None:
    """
    Process a Slack event and group into concerns.

    This would be called from your Slack event webhook handler.

    Args:
        event: Slack event payload
    """
    # Extract message data
    message_id = event.get('id')  # From slack_events table
    message_text = event.get('message_text', '')
    thread_ts = event.get('thread_ts')
    channel_id = event.get('channel_id')
    user_id = event.get('user_id')

    # Initialize grouper (reuse instance in production for better performance)
    grouper = ConcernGrouper()

    # Process the message
    result = grouper.process_message(
        message_id=message_id,
        message_text=message_text,
        thread_ts=thread_ts,
        channel_id=channel_id,
        user_id=user_id
    )

    if result is None:
        print(f"Message {message_id} filtered as irrelevant")
        return

    print(f"Message {message_id} grouped:")
    print(f"  Concern ID: {result.concern_id}")
    print(f"  Method: {result.grouping_method}")
    print(f"  Confidence: {result.confidence}")
    if result.similarity_score:
        print(f"  Similarity: {result.similarity_score:.3f}")
    print(f"  New concern: {result.is_new_concern}")


def main():
    """Example usage."""
    # Simulate a Slack event (in reality, this comes from slack_events table)
    sample_event = {
        'id': 'abc123',  # UUID from slack_events
        'message_text': 'The login button is not working on mobile',
        'thread_ts': None,
        'channel_id': 'C123',
        'user_id': 'U456'
    }

    print("Processing Slack event...")
    print(f"Message: {sample_event['message_text']}\n")

    process_slack_event(sample_event)


if __name__ == "__main__":
    main()
