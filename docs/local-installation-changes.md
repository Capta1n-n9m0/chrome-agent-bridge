# Local installation changes

This document records the changes made while installing the bridge on macOS on
2026-09-22. It deliberately contains no bridge token or other secret.

## Repository changes

- Added `start-bridge.sh`, a macOS launcher that:
  - reads the shared secret from the gitignored `bridge.token` file;
  - defaults `BRIDGE_PORT` to `9234`; and
  - starts the built MCP server with Homebrew's Node.js 20 binary.
- Refreshed `package-lock.json` with `npm audit fix`. This updated transitive
  dependencies to non-breaking patched versions and left the production audit
  with zero known vulnerabilities.
- No files under `extension/src/`, no extension HTML, and no manifest settings
  were changed.

## Machine-level setup

- Installed Homebrew `node@20` (Node.js 20.20.2).
- Installed the repository dependencies with `npm ci`.
- Built `server/dist/index.js` and the bundles under `extension/dist/`.
- Generated `bridge.token` with mode `0600`. The file was already covered by
  `.gitignore` and is not part of this commit.
- Registered the global Codex MCP server `chrome-agent-bridge`, pointing it at
  the repository's `start-bridge.sh`. Codex configuration is stored outside
  this repository and is not part of this commit.

## Verification

- `npm run build`: passed.
- `npm test`: 19 test files and 260 tests passed.
- `npm audit --omit=dev`: zero vulnerabilities.

The remaining audit findings are confined to development tools. They require
breaking upgrades of Vitest and esbuild, so `npm audit fix --force` was not run.

## Browser compatibility

The Safari extension was not installed. This project depends on Chrome-specific
Manifest V3 functionality, including `chrome.debugger`, `chrome.offscreen`, and
a Chrome extension service worker, and declares Chrome 116 as its minimum
browser version. Packaging the files with Apple's Safari converter would not
make those APIs available, so the converted extension would not provide the
bridge's required behavior.

The built browser extension remains ready to load as an unpacked extension in
Google Chrome by following `docs/setup.md` and using the locally generated token
with port `9234`.
