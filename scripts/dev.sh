#!/bin/sh
# Raise file descriptor limit to avoid EMFILE (too many open files) on macOS
ulimit -n 10240 2>/dev/null || true
# Bind to 0.0.0.0 so the app is reachable at localhost and 127.0.0.1
exec npx next dev -H 0.0.0.0 -p 3000
