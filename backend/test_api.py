#!/usr/bin/env python3
"""
Test script for the FDE Slackbot API.

This script tests the /process endpoint with messages from the database.
"""

import sys
import httpx
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from fde_slackbot.lib.supabase_client import get_supabase_client


async def test_api():
    """Test the API endpoints."""
    base_url = "http://localhost:8000"

    print("🧪 Testing FDE Slackbot API\n")

    async with httpx.AsyncClient() as client:
        # Test 1: Health check
        print("1️⃣  Testing health endpoint...")
        try:
            response = await client.get(f"{base_url}/health")
            response.raise_for_status()
            print(f"   ✅ Health check passed: {response.json()}\n")
        except Exception as e:
            print(f"   ❌ Health check failed: {e}\n")
            return

        # Test 2: Get a message from database
        print("2️⃣  Fetching test messages from database...")
        supabase = get_supabase_client()
        result = supabase.table('slack_events').select('id, message_text').limit(5).execute()

        if not result.data:
            print("   ⚠️  No messages found in database. Run test_grouping.py first.\n")
            return

        print(f"   Found {len(result.data)} messages\n")

        # Test 3: Process each message
        for i, message in enumerate(result.data, 1):
            message_id = message['id']
            message_text = message['message_text']

            print(f"3.{i} Processing message: '{message_text[:50]}...'")
            print(f"   Message ID: {message_id}")

            try:
                response = await client.post(
                    f"{base_url}/process",
                    json={"message_id": message_id},
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()

                print(f"   ✅ Success!")
                print(f"   - Category: {result['category']}")
                print(f"   - Confidence: {result['confidence']:.3f}")
                print(f"   - Relevant: {result['is_relevant']}")

                if result['is_relevant']:
                    print(f"   - Concern ID: {result['concern_id']}")
                    print(f"   - Grouping method: {result['grouping_method']}")
                    if result['similarity_score']:
                        print(f"   - Similarity: {result['similarity_score']:.3f}")
                    print(f"   - New concern: {result['is_new_concern']}")

                print()

            except Exception as e:
                print(f"   ❌ Failed: {e}\n")


def main():
    """Run the async test."""
    print("\n" + "="*60)
    print("Make sure the API server is running:")
    print("  ./run_api.sh")
    print("="*60 + "\n")

    asyncio.run(test_api())

    print("="*60)
    print("✨ Tests complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
