# S5-liveC20b runner: dockdiag read 2 (att 2)

Model and effort: Sonnet 5.5, medium. Leaf: no agents, no commits.

## 1. Verdict
DONE. Run exit 0, `CHECK dockdiag remaining=0`, no STOP line. Teardown `CHECK clean PASS`. The Dock side can be read by UIA, and the real reader returned `right`.

## 2. Outputs
- Preflight: git status 7 lines (the six untracked liveB20 files plus the modified ledger); HEAD dfbac13; 9234 free; 8081 free; DevTools-titled windows 0; the diag2 directory absent.
- Evidence (outside the repo): `dockdiag-evidence.txt`, 51 lines. Filtered copy `S13-live-evidence-liveC20-dockdiag2.txt` (51 lines, nothing dropped). Record `S13-live-record-dockdiag-att2.txt` (9 lines, handles and fixed words; kept).

## 3. Answers from the evidence
- **Which try opened the menu:** try 1, the opener (`DOCKDIAG try=1 opened=yes items=4`; the descriptor line `DOCKDIAG button try=1 Button|Customize and control DevTools||toolbar-button main-menu|Exp=Collapsed...`). The button poll found it at `try=1 ms=4`, `found=yes tries=1 ms=32`. The first COUNTS line is at 854 ms and already has `items=4`. Try 2 was not needed.
- **Where the menu appeared:** inside X's own tree, not as a new window: `DOCKDIAG new-top-windows=0`, `NEWWIN` absent. After the invoke the opener's pattern went `Exp=Collapsed` to `Exp=Expanded`. The menu items are MenuItem, Group, Button and ToolBar in X's tree.
- **Dock side items** (fixed names). Each is a Group (Invoke) with a nested Button:

| Name | Group | Button | Button pattern |
|---|---|---|---|
| Undock into separate window | 1 | 1 | `Toggle=Off` |
| Dock to left | 1 | 1 | `Toggle=Off` |
| Dock to bottom | 1 | 1 | `Toggle=Off` |
| Dock to right | 1 | 1 | `Toggle=On` (class adds `toggled`) |

- The Button carries Toggle. No SelectionItem or ExpandCollapse exists on the four side items. The Group carries only Invoke. The `COUNTS` line says `items=4 kinds=u1l1b1r1 pressed-readable=4 pressed=1`: 4 readable, 1 pressed, and the pressed one is Dock to right.
- A MenuItem named "Dock side" (with the arrow-key hint text, Invoke) heads the section. "More tools" and "Help" are `Exp=Collapsed`.
- **The real reader**, verbatim:
  - `CHECK dock-read row=DOCKDIAG windows=0 pane=yes customize=2 invoked=yes items=4 kinds=u1l1b1r1 pressed-readable=4 pressed=1 try=1`
  - `DOCK DOCKDIAG side=right`
- The Leg, AriaRole and AriaProps fields print `n/a` (not measured, verifier 2 §3 F4). They were not needed: Toggle gives the state.
- The window was docked right at the time of the read, so the read agrees with a pressed `Dock to right` button. I made no check against the actual position of the pane.

## 4. Drops and scan
- Dropped: 0 lines per tag (KEY before 0, KEY after 0, MENU 0, NEWWIN 0, button 0). Every name is a fixed DevTools or Chrome string. Chrome-class lines present: 0.
- Scan (the token, the user's name in full and in parts, the Windows folder name, `http`, `www.`, `@`, `C:\`, `\Users\`, `/Users/`, `.com`, `.org`, `.net`, `.io`) over the kept evidence, the record and the stdout: 0 hits. The profile display name was not determined.

## 5. State after
- 8081 was still listening after the run (the wave's server, not freed by the block). Teardown freed it.
- After teardown: DevTools-titled windows 0; 9234 free; 8081-8089 free; node.exe processes 1 (not mine); `git worktree list` 1 entry.
- `git status --short`: 9 lines (the 7 from before plus the filtered evidence and the record file; this report makes 10).
- No DevTools pane or window of the wave is left (`remaining=0`).

## 6. Handoff
The reader only needs a Toggle check on the Button under each of the four "Dock to ..." / "Undock ..." names; the Group's Invoke is not state. The tree and reader are proven for the docked-right case only.
