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
cp -r "$BACKEND_SRC" "$TARGET_DIR"

# Also sync apps/ into src-backend/apps to resolve tool-display.json and other resources
echo "Syncing apps from $APPS_SRC to $TARGET_DIR/apps..."
cp -r "$APPS_SRC" "$TARGET_DIR/apps"

# Also sync extensions/ into src-backend/extensions to resolve provider-catalog etc.
echo "Syncing extensions from $EXTENSIONS_SRC to $TARGET_DIR/extensions..."
cp -r "$EXTENSIONS_SRC" "$TARGET_DIR/extensions"

# Sanitize imports in the copied files
# Matches: from './foo.js' or from "./foo.js" or from "../foo.js" etc.
# Replaces with: from './foo'
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/from ['\"]\(\.\/[^'\"]*\)\.js['\"]/from '\1'/g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/from ['\"]\(\.\.\/[^'\"]*\)\.js['\"]/from '\1'/g" {} +

# Fix relative imports to apps/ and extensions/
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/\.\.\/\.\.\/apps\//\.\/apps\//g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/\.\.\/\.\.\/extensions\//\.\/extensions\//g" {} +

# Matches: import('./foo.js') or import("./foo.js") etc.
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/import(['\"]\(\.\/[^'\"]*\)\.js['\"])/import('\1')/g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/import(['\"]\(\.\.\/[^'\"]*\)\.js['\"])/import('\1')/g" {} +

echo "Backend sync and import sanitization complete."
