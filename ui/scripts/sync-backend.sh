#!/bin/bash
set -e

# Resolve the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
UI_DIR="$(dirname "$DIR")"
BACKEND_SRC="$UI_DIR/../src"
APPS_SRC="$UI_DIR/../apps"
EXTENSIONS_SRC="$UI_DIR/../extensions"
TARGET_DIR="$UI_DIR/src-backend"

echo "Syncing backend from $BACKEND_SRC to $TARGET_DIR..."

# Remove old directory and copy fresh
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

# Sync src/ but exclude tests and large binaries to save memory during build
# NOTE: We MUST include src/media/ as it contains essential .ts files for the build.
# We only exclude the 'media' root directory if it's a large blob storage dir, 
# but src/media is part of the codebase.
rsync -av --exclude="**/__tests__/**" --exclude="**/*.test.ts" --exclude="**/*.live.test.ts" --exclude="**/*.e2e.test.ts" "$BACKEND_SRC/" "$TARGET_DIR/"

# Selective sync for apps/ - only Resources needed for tool-display.json
echo "Syncing required app resources..."
mkdir -p "$TARGET_DIR/apps/shared/PowerDirectorKit/Sources/PowerDirectorKit/Resources"
cp "$APPS_SRC/shared/PowerDirectorKit/Sources/PowerDirectorKit/Resources/tool-display.json" "$TARGET_DIR/apps/shared/PowerDirectorKit/Sources/PowerDirectorKit/Resources/" 2>/dev/null || true

# Selective sync for extensions/
echo "Syncing required extensions..."
mkdir -p "$TARGET_DIR/extensions"
# We need provider-catalog.ts and other core extension files for some UI routes
rsync -av --exclude="**/__tests__/**" --exclude="**/*.test.ts" --exclude="**/node_modules/**" "$EXTENSIONS_SRC/" "$TARGET_DIR/extensions/"

# Sanitize imports in the copied files
# 1. Truly quote-safe .js extension removal for relative and absolute project imports
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i -E "s/(['\"])((\.\/|\.\.\/|powerdirector\/)[^'\"]+)\.js\1/\1\2\1/g" {} +

# 2. Correct mapping for relative apps/ and extensions/ to Next.js path aliases
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i -E "s/(['\"])\.\.\/(\.\.\/)*apps\//\1@\/src-backend\/apps\//g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i -E "s/(['\"])\.\.\/(\.\.\/)*extensions\//\1@\/src-backend\/extensions\//g" {} +

# 3. Correct mapping for absolute powerdirector/ imports to alias
# NOT NEEDED: Webpack aliases and jiti handles this via resolvePluginSdkAlias()
# find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i -E "s/(['\"])powerdirector\/plugin-sdk\/([^'\"]+)\1/\1@\/src-backend\/plugin-sdk\/\2\1/g" {} +
# find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i -E "s/(['\"])powerdirector\/plugin-sdk\1/\1@\/src-backend\/plugin-sdk\/index\1/g" {} +
# find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i -E "s/(['\"])powerdirector\//\1@\/src-backend\//g" {} +

echo "Backend sync and import sanitization complete."
