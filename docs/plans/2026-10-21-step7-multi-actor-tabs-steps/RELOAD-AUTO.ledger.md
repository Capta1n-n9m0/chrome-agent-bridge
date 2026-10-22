# RELOAD-AUTO ledger

Stage: reload the extension by UI automation (decisions.md · 2026-10-23 · #64). Step agent: Opus 5.5.
Started 2026-10-23, HEAD b4ea752.

- [x] Read common.md, #64, e2e-test-plan §1 / §4.15, wave sheet Run 9, recipes/t5-win.ps1.
- [x] Pre-state 22:31Z: Chrome 156.0.8078.48 running (1 user window); no daemon; port 9234 free;
      daemon/dist/index.js sha256 490f1c60…d974; extension/dist mtimes 2026-10-22T21:44:20Z
      (sw.js 503cd20966d31ecf…, content.js 451763bf59d08c1e…, offscreen.js 39daf941d7da8933…,
      options.js 9093499a71f56cd1…); extension last reloaded by the user 19:36Z (pre-T5b).
- [x] Fixture server: python pid 9924 on 127.0.0.1:8080 (mine). W0 = own window 4787250 on ?t5=check.
- [x] Pre-check 22:32:53Z `t5.ts check` → CHECK PASS (not discriminating); daemon pid 26572 spawned by it.
- [x] Explore: `--new-window chrome://extensions` opens a New Tab page (refused); navigated own window
      by omnibox SetValue + Enter. UIA tree: card flattened, name text aid `name`, button aid
      `dev-reload-button`; browser toolbar Reload aid `view_1003` (avoid). ID = sha256(UTF-16LE path).
- [x] Exploratory press 22:34:00Z (by hand, UIA): service worker (Inactive) at +100 ms, back by +400 ms;
      daemon.log `extension resync: 3 tabs, 0 gone` same second; probe → OFFSCREEN 3 ms; check PASS.
- [x] recipes/reload-extension.ps1 written; dry run OK; wrong-ID dry and real → exit 2, nothing pressed.
- [x] Real run 22:37:53Z → exit 0, RELOAD OK; check PASS 22:37:58Z; probe OFFSCREEN 3 ms 22:38:01Z.
- [x] Docs: e2e-test-plan §1 item 9, setup.md §4 pointer.
- [x] Verifier PASS-with-notes (round 0: 4 MINOR, 2 NIT; 2 real runs). Fix round 1 (m1–m4) by me;
      re-check PASS-with-notes (1 real run 22:48:50Z), new NIT R1 fixed after (dry run exit 5).
- [x] Report written; fixture server 9924 stopped (Test-SafeToKill safe); W0 closed; daemon 26572 left to idle out.
- [ ] Commit.

NEXT: commit.
