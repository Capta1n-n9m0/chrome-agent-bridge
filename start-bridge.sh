#!/bin/zsh
# TODO: rework without absolute paths before this is relied on anywhere else.
# As written this only runs on a macOS machine set up exactly like the author's:
# it hardcodes Homebrew's Node 20 (/opt/homebrew/opt/node@20/bin/node), uses a
# zsh shebang, and depends on zsh-only expansions (${0:A:h}). It should resolve
# node from PATH and be portable POSIX sh, with a Windows equivalent alongside.
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
