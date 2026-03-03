#!/bin/bash
set -euo pipefail

TARGET_DIR="${POWERDIRECTOR_TARGET_DIR:-$HOME/powerdirector}"

git grep -i -l "powerdirector" | grep -v '^apps/' | grep -v '^ui/' | grep -v '\.md$' > files_to_process.txt

echo "Found $(wc -l < files_to_process.txt) files to process."

count=0
while IFS= read -r file; do
    if [[ -f "$file" ]]; then
        sed -i 's/POWERDIRECTOR/POWERDIRECTOR/g; s/PowerDirector/PowerDirector/g; s/powerdirector/powerdirector/g' "$file"
        
        dest_path="$TARGET_DIR/$file"
        dest_dir=$(dirname "$dest_path")
        mkdir -p "$dest_dir"
        cp "$file" "$dest_path"
        ((count++))
    fi
done < files_to_process.txt

echo "Successfully updated and copied $count files to $TARGET_DIR."
