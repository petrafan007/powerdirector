#!/bin/bash
# nano-banana-pro runner for PowerDirector

# Exit on error
set -e

# Resolve absolute path to the skill directory
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SKILL_DIR"

# Generate a unique filename if not provided
TIMESTAMP=$(date +%s)
FILENAME="image-${TIMESTAMP}.png"

# Handle optional prompt from PD_SKILL_INPUT
PROMPT="${PD_SKILL_INPUT:-a cybernetic lobster}"

# Handle API key
if [ -n "$PD_SKILL_API_KEY" ]; then
    export GEMINI_API_KEY="$PD_SKILL_API_KEY"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY not set in environment or config." >&2
    exit 1
fi

# Run the python script using uv
uv run "$SKILL_DIR/scripts/image.py" --prompt "$PROMPT" --output "$FILENAME" --model "imagen-4.0-generate-001"
