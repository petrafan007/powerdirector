#!/bin/bash
set -e

# Resolve the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
UI_DIR="$(dirname "$DIR")"
BACKEND_SRC="$UI_DIR/../src"
APPS_SRC="$UI_DIR/../apps"
TARGET_DIR="$UI_DIR/src-backend"

echo "Syncing backend from $BACKEND_SRC to $TARGET_DIR..."

# Remove old directory and copy fresh
rm -rf "$TARGET_DIR"
cp -r "$BACKEND_SRC" "$TARGET_DIR"

# Also sync apps/ into src-backend/apps to resolve tool-display.json and other resources
echo "Syncing apps from $APPS_SRC to $TARGET_DIR/apps..."
cp -r "$APPS_SRC" "$TARGET_DIR/apps"

# Sanitize imports in the copied files
# Matches: from './foo.js' or from "./foo.js" or from "../foo.js" etc.
# Replaces with: from './foo'
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/from ['\"]\(\.\/[^'\"]*\)\.js['\"]/from '\1'/g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/from ['\"]\(\.\.\/[^'\"]*\)\.js['\"]/from '\1'/g" {} +

# Fix relative imports to apps/
# We use @/src-backend/apps/... for clean resolution in Next.js
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/\.\.\/\.\.\/apps\//\.\/apps\//g" {} +

# Extra safety for tool-display.json
# Next.js bundler sometimes struggles with complex relative paths in synced dirs.
# The tool-display.ts has been updated with a try-catch, but we still want the path to be correct.

# Matches: import('./foo.js') or import("./foo.js") etc.
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/import(['\"]\(\.\/[^'\"]*\)\.js['\"])/import('\1')/g" {} +
find "$TARGET_DIR" -type f -name "*.ts" -exec sed -i "s/import(['\"]\(\.\.\/[^'\"]*\)\.js['\"])/import('\1')/g" {} +

echo "Backend sync and import sanitization complete."
