import os
import re

files_to_fix = [
    "src/gateway/session-utils.fs.ts",
    "src/daemon/launchd-restart-handoff.ts",
    "src/pairing/pairing-store.ts",
    "src/config/artifact-paths.ts",
    "src/config/agent-dirs.ts",
    "src/telegram/update-offset-store.ts",
    "src/telegram/bot-native-command-menu.ts",
    "src/telegram/thread-bindings.ts",
    "src/discord/monitor/model-picker-preferences.ts",
    "src/hooks/bundled/session-memory/handler.ts",
    "src/hooks/bundled/command-logger/handler.ts",
    "src/core/canvas-host.ts",
    "src/core/memory/qmd.ts",
    "src/core/memory/config.ts",
    "src/core/memory/utils.ts",
    "src/agents/bash-tools.shared.ts",
    "src/agents/skills/workspace.ts",
    "src/agents/skills/refresh.ts",
    "src/agents/workspace.ts",
    "src/agents/pi-tools.host-edit.ts",
    "src/agents/sandbox-paths.ts",
    "src/agents/memory-search.ts",
    "src/tools/bear-notes.ts",
    "src/memory/qmd-manager.ts",
    "src/browser/chrome.executables.ts",
    "src/browser/trash.ts",
    "src/browser/chrome.ts",
    "src/commands/status.scan.fast-json.ts",
    "src/commands/doctor-gateway-services.ts",
    "src/commands/doctor-platform-notes.ts",
    "src/cli/update-cli/shared.ts",
    "src/cli/update-cli/restart-helper.ts",
    "src/cli/profile.ts",
    "src/cli/gateway-cli/dev.ts",
    "src/cli/completion-cli.ts",
    "src/cli/memory-cli.ts",
    "src/media-understanding/runner.ts",
    "src/infra/update-global.ts",
    "src/infra/runtime-paths.ts",
    "src/infra/fs-safe.ts",
    "src/infra/brew.ts",
    "src/infra/path-env.ts",
    "src/infra/boundary-path.ts",
    "src/infra/state-migrations.ts",
    "src/infra/restart.ts",
    "src/infra/shell-env.ts",
    "src/infra/update-git-runtime-files.ts",
    "src/infra/provider-usage.shared.ts"
]

def get_relative_path(from_file, to_file):
    # from_file is e.g. src/gateway/session-utils.fs.ts
    # to_file is e.g. src/infra/os-safe.js
    
    from_dir = os.path.dirname(from_file)
    to_dir = os.path.dirname(to_file)
    
    rel_dir = os.path.relpath(to_dir, from_dir)
    if not rel_dir.startswith("."):
        rel_dir = "./" + rel_dir
    
    base_name = os.path.basename(to_file)
    return os.path.normpath(os.path.join(rel_dir, base_name))

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        continue
        
    with open(file_path, "r") as f:
        original_content = f.read()
    
    content = original_content
    
    # 1. Add safeHomedir import if used but missing
    uses_safeHomedir = "safeHomedir" in content
    has_import = re.search(r"import\s*\{[^}]*safeHomedir[^}]*\}\s*from\s*['\"].*os-safe", content)
    
    if uses_safeHomedir and not has_import:
        rel_path = get_relative_path(file_path, "src/infra/os-safe.js")
        # Ensure it has .js extension as requested
        if not rel_path.endswith(".js"):
            rel_path += ".js"
        
        import_stmt = f'import {{ safeHomedir }} from "{rel_path}";\n'
        
        lines = content.splitlines(keepends=True)
        inserted = False
        # Try to insert after any existing imports
        last_import_index = -1
        for i, line in enumerate(lines):
            if line.startswith("import"):
                last_import_index = i
        
        if last_import_index != -1:
            lines.insert(last_import_index + 1, import_stmt)
            inserted = True
        else:
            # No imports found, insert after shebang or at top
            if lines and lines[0].startswith("#!"):
                lines.insert(1, import_stmt)
            else:
                lines.insert(0, import_stmt)
            inserted = True
            
        content = "".join(lines)
        print(f"Added import to {file_path}")
    
    # 2. Clean up os imports
    # Match both 'import os from "node:os"' and 'import * as os from "node:os"'
    os_import_match = re.search(r"import\s+(?:os|\*\s+as\s+os)\s+from\s+['\"]node:os['\"];?\n?", content)
    if os_import_match:
        # Check if 'os.' is used for other things
        # But exclude os.homedir and os.tmpdir
        other_os_usages = re.findall(r"\bos\.(?!homedir|tmpdir)([a-zA-Z0-9_]+)", content)
        if not other_os_usages:
            # Also check if 'os' is used as a value elsewhere
            # Regex for 'os' not followed by '.' and not preceded by 'import ' or 'as '
            # This is tricky, let's just check for 'os.' for now as it's the most common usage.
            # But wait, 'os' might be used as a parameter.
            
            # Simple check: if 'os' appears only in the import and as 'os.homedir' or 'os.tmpdir'
            # (But we already checked for os.homedir and it was empty)
            
            # Let's see if 'os' is used at all besides the import
            all_os_occurrences = re.findall(r"\bos\b", content)
            # 1 for 'import os', maybe more for 'os.something'
            if len(all_os_occurrences) <= 1:
                content = content.replace(os_import_match.group(0), "")
                print(f"Removed unused os import from {file_path}")
            else:
                # Check if all other occurrences are 'os.homedir' or 'os.tmpdir'
                # (We know os.homedir is not there, so just check if any other exists)
                if not other_os_usages:
                    # If there are occurrences of 'os' but no 'os.something' (where something is NOT homedir/tmpdir)
                    # then maybe it's used as a value.
                    pass
                
    # Write back if changed
    if content != original_content:
        with open(file_path, "w") as f:
            f.write(content)
    else:
        # print(f"No changes needed for {file_path}")
        pass
