#!/usr/bin/env python3
"""
Test script for concern grouping system.

This script tests the 5-level hierarchical grouping algorithm with sample messages.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from fde_slackbot.grouping import ConcernGrouper, get_all_concerns, get_messages_for_concern
from fde_slackbot.lib.supabase_client import get_supabase_client
from datetime import datetime, timezone
from uuid import uuid4


# Test messages from the spec
TEST_MESSAGES = [
    # Bug reports - should group together
    {
        "text": "The login button doesn't work on mobile.",
        "category": "bug_report",
        "expected_group": "login_bug"
    },
    {
        "text": "I'm getting an error when trying to login from my phone.",
        "category": "bug_report",
        "expected_group": "login_bug"
    },
    {
        "text": "Mobile login is broken, keeps showing error",
        "category": "bug_report",
        "expected_group": "login_bug"
    },

    # Feature requests - should group together
    {
        "text": "Can you add export to CSV?",
        "category": "feature_request",
        "expected_group": "csv_export"
    },
    {
        "text": "I don't see a button for CSV export right now",
        "category": "feature_request",
        "expected_group": "csv_export"
    },
    {
        "text": "Would be great to have CSV download feature",
        "category": "feature_request",
        "expected_group": "csv_export"
    },

    # Different bug - should NOT group with login bug
    {
        "text": "Getting a 500 error when I try to upload files",
        "category": "bug_report",
        "expected_group": "upload_bug"
    },

    # Irrelevant messages - should be filtered out
    {
        "text": "Thanks!",
        "category": "irrelevant",
        "expected_group": None
    },
    {
        "text": "See you tomorrow",
        "category": "irrelevant",
        "expected_group": None
    },
]


def insert_test_slack_event(message_text: str) -> str:
    """Insert a test slack_event and return its ID."""
    supabase = get_supabase_client()

    event_id = f"test_{uuid4()}"
    message_ts = str(datetime.now(timezone.utc).timestamp())

    data = {
        "event_id": event_id,
        "event_type": "message",
        "channel_id": "C123TEST",
        "user_id": "U456TEST",
        "message_text": message_text,
        "message_ts": message_ts,
        "raw_payload": {
            "type": "event_callback",
            "event": {
                "type": "message",
                "text": message_text,
                "ts": message_ts,
            }
        }
    }

    response = supabase.table('slack_events').insert(data).execute()
    return response.data[0]['id']


def main():
    """Run grouping tests."""
    print("=" * 80)
    print("CONCERN GROUPING TEST")
    print("=" * 80)

    # Initialize grouper
    print("\n1. Initializing ConcernGrouper...")
    grouper = ConcernGrouper()
    print("✅ Grouper initialized")

    # Process each test message
    print("\n2. Processing test messages...\n")
    print("-" * 80)

    results = []

    for i, test_msg in enumerate(TEST_MESSAGES, 1):
        text = test_msg["text"]
        expected_category = test_msg["category"]

        print(f"\n{i}. Message: \"{text}\"")
        print(f"   Expected category: {expected_category}")

        # Insert into slack_events first
        try:
            message_id = insert_test_slack_event(text)
            print(f"   Inserted slack_event: {message_id}")
        except Exception as e:
            print(f"   ❌ Error inserting slack_event: {e}")
            continue

        # First, test the classifier directly
        classification = grouper.classifier.classify(text)
        print(f"   📝 Classification: category={classification.category}, conf={classification.confidence:.2f}, relevant={classification.is_relevant}, method={classification.method}")

        # Process message
        try:
            result = grouper.process_message(
                message_id=message_id,
                message_text=text,
                channel_id="C123TEST"
            )

            if result is None:
                print(f"   ✅ Message filtered as irrelevant (expected: {expected_category == 'irrelevant'})")
                results.append({
                    "text": text,
                    "filtered": True,
                    "expected_filter": expected_category == "irrelevant"
                })
            else:
                print(f"   ✅ Grouped into concern: {result.concern_id}")
                print(f"   📊 Method: {result.grouping_method}")
                print(f"   🎯 Confidence: {result.confidence}")
                if result.similarity_score:
                    print(f"   📐 Similarity: {result.similarity_score:.3f}")
                print(f"   🆕 New concern: {result.is_new_concern}")

                results.append({
                    "text": text,
                    "concern_id": str(result.concern_id),
                    "method": result.grouping_method,
                    "confidence": result.confidence,
                    "similarity": result.similarity_score,
                    "is_new": result.is_new_concern
                })

        except Exception as e:
            print(f"   ❌ Error processing message: {e}")
            import traceback
            traceback.print_exc()

    # Show all concerns
    print("\n" + "=" * 80)
    print("3. All Concerns Created\n")
    print("-" * 80)

    try:
        all_concerns = get_all_concerns(status="open")
        print(f"\nTotal concerns: {len(all_concerns)}")

        for concern in all_concerns:
            print(f"\n📁 Concern ID: {concern.id}")
            print(f"   Category: {concern.category}")
            print(f"   Title: {concern.title}")
            print(f"   Messages: {concern.message_count}")
            print(f"   Status: {concern.status}")
            print(f"   Created: {concern.first_seen}")
            print(f"   Updated: {concern.last_updated}")

            # Show messages in this concern
            messages = get_messages_for_concern(concern.id)
            print(f"   Message texts:")
            for msg in messages:
                print(f"     - \"{msg['message_text']}\"")

    except Exception as e:
        print(f"❌ Error fetching concerns: {e}")
        import traceback
        traceback.print_exc()

    # Summary
    print("\n" + "=" * 80)
    print("4. Test Summary\n")
    print("-" * 80)

    grouped_concerns = {}
    for r in results:
        if not r.get('filtered'):
            cid = r['concern_id']
            if cid not in grouped_concerns:
                grouped_concerns[cid] = []
            grouped_concerns[cid].append(r['text'])

    print(f"\nTotal messages processed: {len(TEST_MESSAGES)}")
    print(f"Messages grouped: {len([r for r in results if not r.get('filtered')])}")
    print(f"Messages filtered: {len([r for r in results if r.get('filtered')])}")
    print(f"Unique concerns created: {len(grouped_concerns)}")

    print("\nGrouping breakdown:")
    for cid, texts in grouped_concerns.items():
        print(f"\nConcern {cid[:8]}... ({len(texts)} messages):")
        for text in texts:
            print(f"  - \"{text}\"")

    print("\n" + "=" * 80)
    print("✅ Test completed!")


if __name__ == "__main__":
    main()
