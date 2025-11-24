#!/bin/bash
# Start the FDE Slackbot API server

set -e

echo "Starting FDE Slackbot API server..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run with uvicorn
uv run uvicorn fde_slackbot.api.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info

# Alternative: Run directly with Python (if uvicorn is installed in venv)
# uv run python -m fde_slackbot.api.main
