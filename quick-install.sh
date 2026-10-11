#!/usr/bin/env bash
# Mercatta Growth — Quick Install Entrypoint
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
if [ -f "$SCRIPT_DIR/install-coolify.sh" ]; then
    bash "$SCRIPT_DIR/install-coolify.sh" "$@"
else
    curl -fsSL https://raw.githubusercontent.com/Mercattatech/Blog-Mercatta-Growth/main/install-coolify.sh | bash
fi
