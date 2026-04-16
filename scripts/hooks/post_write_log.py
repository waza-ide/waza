import sys
import json
from datetime import datetime

data: dict = {}
if not sys.stdin.isatty():
    try:
        data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        data = {}

file_path: str = data.get("file_path", "unknown")
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
print(f"[{timestamp}] wrote: {file_path}", file=sys.stderr)
