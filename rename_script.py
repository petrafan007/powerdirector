import os

def rename_all(root_dir):
    paths_to_rename = []
    for root, dirs, files in os.walk(root_dir, topdown=False):
        for name in dirs + files:
            full_path = os.path.join(root, name)
            if any(s in name for s in ["OpenClaw", "openclaw", "OPENCLAW"]):
                paths_to_rename.append(full_path)

    # Sort by depth (number of parts in path) descending
    paths_to_rename.sort(key=lambda x: x.count(os.sep), reverse=True)

    for old_path in paths_to_rename:
        if not os.path.exists(old_path):
            continue
        dir_name, old_name = os.path.split(old_path)
        new_name = old_name.replace("OpenClaw", "PowerDirector").replace("openclaw", "powerdirector").replace("OPENCLAW", "POWERDIRECTOR")
        new_path = os.path.join(dir_name, new_name)
        
        if old_path != new_path:
            if os.path.exists(new_path):
                if os.path.isdir(old_path) and os.path.isdir(new_path):
                    # Merge directories
                    for root, dirs, files in os.walk(old_path):
                        relative_root = os.path.relpath(root, old_path)
                        target_root = os.path.join(new_path, relative_root)
                        if not os.path.exists(target_root):
                            os.makedirs(target_root)
                        for file in files:
                            s = os.path.join(root, file)
                            d = os.path.join(target_root, file)
                            if os.path.exists(d):
                                os.remove(d) # Overwrite
                            os.rename(s, d)
                    # Clean up empty dirs in old_path
                    for root, dirs, files in os.walk(old_path, topdown=False):
                        if not os.listdir(root):
                            os.rmdir(root)
                elif os.path.isfile(old_path):
                    os.remove(new_path)
                    os.rename(old_path, new_path)
                else:
                    # One is dir, one is file? Unlikely but possible
                    print(f"Type mismatch: {old_path} and {new_path}")
            else:
                os.rename(old_path, new_path)

if __name__ == "__main__":
    rename_all("apps")
