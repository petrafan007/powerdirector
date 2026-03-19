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
rsync -av --exclude="**/__tests__/**" --exclude="**/*.test.ts" --exclude="**/*.live.test.ts" --exclude="**/*.e2e.test.ts" --exclude="**/media/**" "$BACKEND_SRC/" "$TARGET_DIR/"

# Selective sync for apps/ - only Resources needed for tool-display.json
echo "Syncing required app resources..."
mkdir -p "$TARGET_DIR/apps/shared/PowerDirectorKit/Sources/PowerDirectorKit/Resources"
cp "$APPS_SRC/shared/PowerDirectorKit/Sources/PowerDirectorKit/Resources/tool-display.json" "$TARGET_DIR/apps/shared/PowerDirectorKit/Sources/PowerDirectorKit/Resources/" 2>/dev/null || true

# Selective sync for extensions/ - only provider-catalogs needed for discovery
echo "Syncing required extensions..."
mkdir -p "$TARGET_DIR/extensions"
find "$EXTENSIONS_SRC" -maxdepth 2 -name "provider-catalog.ts" -exec cp --parents {} "$TARGET_DIR/" \; 2>/dev/null || true
# provider-catalog resolution
find "$TARGET_DIR/home/jcavallarojr/powerdirector-newusertest/extensions" -type f -exec mv {} "$TARGET_DIR/extensions/" 2>/dev/null || true
rm -rf "$TARGET_DIR/home" 2>/dev/null || true

# Sanitize imports in the copied files
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/from ['\"]\(\.\/[^'\"]*\)\.js['\"]/from '\1'/g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/from ['\"]\(\.\.\/[^'\"]*\)\.js['\"]/from '\1'/g" {} +

# Fix relative imports to apps/ and extensions/
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/\.\.\/\.\.\/apps\//\.\/apps\//g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/\.\.\/\.\.\/extensions\//\.\/extensions\//g" {} +

echo "Backend sync and import sanitization complete."
