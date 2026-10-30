# S5-liveC20b runner: dockdiag read

Model and effort: Sonnet, medium. Leaf: no agents, no commits.

## 1. Verdict
DONE for the run (exit 0, `CHECK dockdiag remaining=0`, teardown `CHECK clean PASS`). The diagnostic did NOT reach the Dock side items: it invoked nothing.

## 2. Outputs
- Preflight: git status 7 lines (the six untracked liveB20 files plus the modified ledger); HEAD contains 95e0abc; port 9234 had no listener (free); 8081 free; DevTools-titled windows 0; diag out dir absent.
- Run exit 0. Record lines: `CHECK devtools-menu step=menu-button|more-tools|developer-tools found=yes`, `CHECK devtools-ui method=uia-menu found=pane`, `KEY F12 pressed`, `CHECK dockdiag remaining=0`. No STOP line.
- Teardown exit 0, `CHECK clean PASS`.
- Evidence (outside repo): `dockdiag-evidence.txt`, 31 lines. Filtered copy: `S13-live-evidence-liveC20-dockdiag.txt`, 31 lines. Record file `S13-live-record-dockdiag.txt` (8 lines: handles and fixed words, one window handle) kept in the steps dir; scan clean.

## 3. Structural facts
- DevTools opened as a pane in X's tree: `pane=yes elements=173`.
- Customize button: the exact-name poll matched 2 elements on all 21 tries (ms 4 to 8395), `elements` stable at 173, so the tree was not late. The two matches are the same name "Customize and control DevTools": a Group (toolbar-button main-menu, Exp=Collapsed) and a Button (icon only, Invoke). Because there are two, the instrument reported `no unique Customize or More options button inside the pane: nothing invoked`. Found = no in the poll's terms; no invoke, no menu, no MENU or NEWWIN lines, no Dock side items read.
- Cause is uniqueness, not a missing or renamed button. The Button has the Invoke pattern; the Group has ExpandCollapse (Collapsed).
- Dock side items: not read (never opened). KEY region devtools-doc, 4 lines: the two Customize elements and two "Show Console sidebar" (Group and Button, Invoke).
- Dock side: nothing in this evidence says anything about it; it is unchanged by construction. Whether UIA can read it is unanswered.
- Leg/AriaRole/AriaProps print n/a (managed UIA cannot read those ids; "not measured", verifier 2 §3 F4).

## 4. Drops and scan
- Dropped: 0 lines per tag (every name is a fixed DevTools string). Chrome-class lines: 0 present.
- Scan (token, the user's name in full and in parts, the Windows folder name, `http`, `www.`, `@`, `C:\`, `\Users\`, `/Users/`, `.com`, `.org`, `.net`, `.io`) over the kept file, the record file and the stdout: 0 hits. The profile display name was not determined.

## 5. State after
DevTools-titled windows 0; 9234 free; 8081-8089 free; node processes 1 (not mine to touch, none started by me); `git worktree list` 1 entry; git status 9 lines (the earlier 7 plus two new files from this run: evidence, record, plus this report is the third).

## 6. Proposed fix
The instrument should pick the Button-type match (or the Invoke-capable one) when the exact name matches a Group plus a Button, then rerun dockdiag. A fix round is needed before another run.
