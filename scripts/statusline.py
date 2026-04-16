import subprocess
import sys


def get_branch() -> str:
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() or "no-branch"
    except Exception:
        return "unknown"


def get_dirty() -> str:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
        )
        return "*" if result.stdout.strip() else ""
    except Exception:
        return ""


branch = get_branch()
dirty = get_dirty()
print(f"waza | {branch}{dirty}")
