#!/bin/zsh
set -euo pipefail

bridge_dir="${0:A:h}"
token_file="$bridge_dir/bridge.token"

if [[ ! -r "$token_file" ]]; then
  print -u2 "Missing bridge token: $token_file"
  exit 1
fi

export BRIDGE_TOKEN="$(<"$token_file")"
export BRIDGE_PORT="${BRIDGE_PORT:-9234}"

exec /opt/homebrew/opt/node@20/bin/node "$bridge_dir/server/dist/index.js"
