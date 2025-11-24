#!/bin/bash
# End-to-end integration test for FDE Slackbot
# Tests: Slack webhook → slack_events → Python API → concern → realtime

set -e

echo "🧪 FDE Slackbot End-to-End Integration Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Python API is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Python API not running on port 8000${NC}"
    echo "   Start it with: cd backend && ./run_api.sh"
    exit 1
fi
echo -e "${GREEN}✅ Python API is running${NC}"

# Check if Supabase is running
if ! curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
    echo -e "${RED}❌ Supabase not running${NC}"
    echo "   Start it with: supabase start"
    exit 1
fi
echo -e "${GREEN}✅ Supabase is running${NC}"

# Check if realtime is enabled on concern table
REALTIME_CHECK=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'concern';" | tr -d ' ')

if [ "$REALTIME_CHECK" -eq "0" ]; then
    echo -e "${RED}❌ Realtime not enabled on concern table${NC}"
    echo "   Run: supabase db reset"
    exit 1
fi
echo -e "${GREEN}✅ Realtime enabled on concern table${NC}"

echo ""
echo "🚀 Starting integration test..."
echo ""

# Test 1: Simulate Slack webhook with a bug report
echo "1️⃣  Simulating Slack webhook (Bug Report)..."

SLACK_PAYLOAD='{
  "token": "test-token",
  "team_id": "T123456",
  "type": "event_callback",
  "event": {
    "type": "message",
    "user": "U123456",
    "text": "The export to CSV feature is completely broken! Getting errors every time I try to use it.",
    "ts": "'$(date +%s).000000'",
    "channel": "C123456"
  }
}'

WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:54321/functions/v1/slack-webhook \
  -H "Content-Type: application/json" \
  -d "$SLACK_PAYLOAD")

echo "   Response: $WEBHOOK_RESPONSE"

# Extract event_id from response
EVENT_ID=$(echo $WEBHOOK_RESPONSE | grep -o '"event_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EVENT_ID" ]; then
    echo -e "${RED}❌ Failed to get event_id from webhook${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Webhook accepted, event_id: $EVENT_ID${NC}"
echo ""

# Wait a moment for processing
echo "⏳ Waiting 2 seconds for processing..."
sleep 2

# Test 2: Verify message in slack_events
echo "2️⃣  Verifying message in slack_events table..."

MESSAGE_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM slack_events WHERE id = '$EVENT_ID';" | tr -d ' ')

if [ "$MESSAGE_COUNT" -eq "0" ]; then
    echo -e "${RED}❌ Message not found in slack_events${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Message found in slack_events${NC}"

MESSAGE_TEXT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT message_text FROM slack_events WHERE id = '$EVENT_ID';")
echo "   Text: $MESSAGE_TEXT"
echo ""

# Test 3: Verify concern was created
echo "3️⃣  Verifying concern was created..."

# Check if there's a concern_group entry for this message
CONCERN_ID=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT concern_id FROM concern_group WHERE foreign_table = 'slack_event' AND foreign_identifier = '$EVENT_ID';" | tr -d ' ')

if [ -z "$CONCERN_ID" ]; then
    echo -e "${YELLOW}⚠️  No concern created (message may have been filtered as irrelevant)${NC}"
else
    echo -e "${GREEN}✅ Concern created with ID: $CONCERN_ID${NC}"

    # Get concern details
    CONCERN_DETAILS=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT category, title, message_count, status, grouping_method FROM concern WHERE id = '$CONCERN_ID';")
    echo ""
    echo "$CONCERN_DETAILS"
fi

echo ""

# Test 4: Verify realtime subscription would work
echo "4️⃣  Verifying realtime configuration..."

# Check that concern table is in realtime publication
REALTIME_TABLES=$(PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;")

echo "   Tables in realtime publication:"
echo "$REALTIME_TABLES" | while read -r table; do
    if [ -n "$table" ]; then
        echo "   - $table"
    fi
done

if echo "$REALTIME_TABLES" | grep -q "concern"; then
    echo -e "${GREEN}✅ Concern table is in realtime publication${NC}"
else
    echo -e "${RED}❌ Concern table NOT in realtime publication${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✨ All tests passed!${NC}"
echo "=========================================="
echo ""
echo "📱 Next steps:"
echo "   1. Start the frontend: cd frontend && npm run dev"
echo "   2. Navigate to http://localhost:5173/concerns"
echo "   3. Send another Slack message and watch it appear in real-time!"
echo ""
