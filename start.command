#!/bin/bash
cd "$(dirname "$0")"
PORT=8000
(sleep 1; open "http://127.0.0.1:${PORT}/") &
exec python3 -m http.server "$PORT"
