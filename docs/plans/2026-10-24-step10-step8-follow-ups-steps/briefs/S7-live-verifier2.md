# S7 live verifier — dispatch amendments (2026-10-25, fresh step agent under #225)

You are a NEW, INDEPENDENT level-2 LIVE VERIFIER (Opus 5.5). Your brief is `briefs/S7-live-verifier.md` (read it in
full; it binds, including its pasted common parts) **with these amendments**, written because the wave changed after
that brief was written:

A1. Run 15 has five attempts' worth of evidence: attempt 1 (runner 1, stopped at block 4, no row), attempt 1 after the
    reset (runner 2, Return 2), attempt 2 (runner 3, Return 3), attempt 3 (runner 4: rows, teardown, PP1, RET-1 Return 4),
    the post-relaunch runner (Return 5), runner A (the RET-1 end read-back redone under #223 — equal) and attempt 4
    (runner B: MCPF-1R, CAP-1R, R15-3R, restore/logs/teardown, RET-1R). Archived raw outputs and state files are under
    `%TEMP%\bridge-e2e\s15\` (suffixes `.20261025T…Z`) and `%TEMP%\bridge-e2e\s15-ret1r\`; `legs-raw.txt` holds the legs.
A2. S7.5 is superseded: PP1 and RET-1 were GRANTED (decisions.md #221, widened by #222). Judge PP1 (read-only; only its
    own files deleted; sizes/sha256 only in the record; no data, no course name beyond "pp1"), RET-1 (NOT MEASURED after
    the failed relaunch; its end read-back redone under #223 → equal) and RET-1R against §4.22's RET-1R text. Check every
    Chrome kill in the traces is RET-1's or RET-1R's (G10-2) and nothing else killed or restarted Chrome.
A3. The re-measurement rows MCPF-1R, CAP-1R, R15-3R, RET-1R, SW-1R were committed (`docs/e2e-test-plan.md` §4.22) before
    they ran: check by `git log` / stamps. R15-3R ran under #224 (read it): check the exempted window met BOTH conditions
    from the guard's own lines (owned by a wave window; overlapping none of the five read rects), and that no other
    occluder was exempted. MCPF-1 / CAP-1 FAIL, R15-3 NOT MEASURED, SAVE-REFUSE FAIL and RET-1 NOT MEASURED stand as
    recorded; judge whether those verdicts follow the pass rules.
A4. **Transcript scan (explicitly required):** count over EVERY actor transcript of attempts 1–4 (`mcpf-click`,
    `mcpf-type`, `mcpf-press`, `cap`, `save`, `fix`, `big`, `jsd`, `off`, `on`, `mcpf1r-*`, `cap1r`, and `pp1` separately)
    the `scheme://host` occurrences with a host other than `localhost`/`127.0.0.1`/`*.localhost`/this extension's id, the
    token, and the test patterns (incl. `saveblk.localhost`) — by count, never printing them. Runner B's block `logs`
    reports 14 transcripts at 0; re-derive independently. The SAVE value-run counts could not be compared in attempt 4
    (the value files were deleted by attempt 3's teardown) — say what remains provable.
A5. Also check: the worker-console check NOT MEASURED in attempt 4 (its control line comes only from a toolbar disarm);
    Chrome showed 3 visible windows before RET-1R's kill and 2 after (runner B) — is there evidence any window of the
    user's was touched by the wave? (read-only reasoning from the traces; never touch Chrome).
A6. Since the brief: `S7-daemon-log.txt` and `S7-run-raw.txt` were rewritten by attempt 4's blocks; the uncommitted files
    are `S7-run-record.md`, `S7.ledger.md`, `S7-daemon-log.txt`, `S7-run-raw.txt`. Daemon node 1428 (spawned by
    RET-1R's start check) may still be idling on 9234 — it is the bridge daemon; never kill it. Node 22152, claude
    23208/24284 are not ours.
Read-only: no live Chrome, no daemon start, no 9234 client, no block, no `claude -p`. Write
the report to `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-live-verifier.md` (the steps dir, not `briefs/`).
