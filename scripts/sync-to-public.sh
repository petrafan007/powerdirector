#!/bin/bash

# PowerDirector Public Distribution Synchronizer
# Usage: ./scripts/sync-to-public.sh

SOURCE_DIR="/home/jcavallarojr/powerdirector"
TARGET_DIR="/home/jcavallarojr/powerdirector-public"

echo "==== PowerDirector Sync: Production -> Public ===="
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Target directory $TARGET_DIR does not exist."
    exit 1
fi

# 1. Sync files with basic exclusions to avoid massive transfers
rsync -av --delete --progress \
    --exclude '.git/' \
    --exclude '**/node_modules/' \
    --exclude '**/dist/' \
    --exclude '**/out/' \
    --exclude '**/build/' \
    --exclude 'ui/.next/' \
    --exclude '**/media/' \
    --exclude '**/memory/' \
    --exclude '**/logs/' \
    --exclude '**/tmp/' \
    --exclude '**/*.tar.gz' \
    --exclude '**/*.db' \
    --exclude '**/*.sqlite' \
    --exclude '**/*.bak' \
    --exclude 'powerdirector-source/' \
    --exclude '.gemini/' \
    --exclude '.qodo/' \
	--exclude 'talk/' \
	--exclude 'moltbook-adk/' \
    "$SOURCE_DIR/" "$TARGET_DIR/"

# 2. Surgical Purge of sensitive/unwanted patterns in the target folder
# This is a fail-safe to ensure that even if rsync exclusions were missed, the public folder is clean.
echo "Performing final surgical purge of sensitive and excluded files from $TARGET_DIR..."

# Remove Directories
find "$TARGET_DIR" -type d \( \
    -name ".git" -o \
    -name "node_modules" -o \
    -name "dist" -o \
    -name ".next" -o \
    -name ".wwebjs_auth" -o \
    -name "tests" -o \
    -name "logs" -o \
    -name "tmp" -o \
    -name "media" -o \
    -name "memory" -o \
    -name "powerdirector-source" -o \
    -name "powerdirector-analysis" -o \
    -name ".gemini" -o \
    -name ".qodo" -o \
    -name "artifacts" \
\) -exec rm -rf {} +

# Remove Files
find "$TARGET_DIR" -type f \( \
    -name ".env*" -o \
    -name "*.db" -o \
    -name "*.sqlite" -o \
    -name "*.bak" -o \
    -name "*.tar.gz" -o \
    -name "powerdirector.config.json" -o \
    -name "latest_session.json" -o \
    -name "recent_messages.txt" -o \
    -name "schema-debug.json" -o \
    -name "nohup.out" -o \
    -name "server.log" -o \
    -name "test-*.js" -o \
    -name "*.test.ts" -o \
    -name ".tmp_*" -o \
    -name "*.md" ! -name "FRIGATE_OPS.md" ! -name "README.md" \
\) -delete

# 3. Ensure the public config template exists
if [ -f "$SOURCE_DIR/powerdirector.config.json" ]; then
    echo "Updating public config template..."
    if [ ! -f "$TARGET_DIR/powerdirector.config.json.template" ]; then
        cp "$SOURCE_DIR/powerdirector.config.json" "$TARGET_DIR/powerdirector.config.json.template"
    fi
fi

echo "==== Sync Complete ===="
echo "Note: All PRIVATE files, MD files, tests, and build artifacts have been globally excluded and purged."
