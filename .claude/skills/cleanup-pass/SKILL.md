---
name: cleanup-pass
description: Keep this repo's docs true and small — a lead cleaner runs scripts/doc-check.mjs, reads the diff since the last cleanup report, sends area cleaners (state, gotcha placement, procedure, decisions, plan drift) at the areas the diff touched, applies mechanical fixes itself and proposes the rest to the user. Use at a phase close (full pass), at closeout after any session that changed docs, CLAUDE.md files or skills (quick pass), or when the user asks to "clean up the docs", "check the docs", or "run the cleaner".
---

# Cleanup pass

Rules for every agent: `docs/agent-rules.md`. Docs conventions: `docs/docs-writing-guide.md`.
Reports: `docs/cleanup/<YYYY-MM-DD>[-n].md`.

## Who

1. **Lead cleaner** (Opus, a fresh agent, not a fork, so it is not anchored on the session's view).
   It runs `node scripts/doc-check.mjs`, reads `git diff <last cleanup report's commit>..HEAD --stat`
   (first pass ever: the commit the brief names) and the changed docs, and sends only the area cleaners whose area the changes touched. On a
   quick pass it may cover a small area itself.
2. **Area cleaners** report numbered findings and never edit: location, what is wrong, evidence
   (quote both sides of a contradiction), a suggested fix, mechanical or needs-the-user.

**Area-cleaner brief** (the lead fills it; it points, never pastes):
```
ROLE: area cleaner (<area>) — cleanup pass <date>, chrome-agent-bridge. Read docs/agent-rules.md
first (§6 Lead cleaner / area cleaner) and .claude/skills/cleanup-pass/SKILL.md (your area's row).
SCOPE: git diff <base>..HEAD; the files of your area: <paths>. doc-check output: <path or "run it">.
OUTPUT: <docs/cleanup/<date>-evidence/<area>.md>, numbered findings as above. Read only; no commit.
```

**Records and living docs:** `docs/docs-writing-guide.md` § Doc types.

| Area | Checks | Model (effort medium, passed explicitly) |
|---|---|---|
| **State** | the root Current state against the phase doc, the roadmap header and `git log`; status text anywhere else | Sonnet, effort medium |
| **Gotcha placement** | each gotcha sits with the code an agent would edit to break it, other packages get a pointer (#232); no duplicates; each file within budget; Key files match the tree | Sonnet, effort medium |
| **Procedure** | skills, kickoffs and briefs that paste rules, spec text or numbers; drift from `docs/agent-rules.md` | Sonnet, effort medium |
| **Decisions** | Open and Standing decisions match what was ruled and built; superseded entries marked; the archive index and `#N` citations resolve | Opus |
| **Plan drift** (full pass only) | what the as-built broke in later plans, `docs/setup.md`, `docs/e2e-test-plan.md`, `recipes/README.md`, `README.md`, the spec | Opus |

## How

1. **The lead re-checks every finding before acting on it** (open the file, see the quoted text).
   A finding that does not reproduce is dropped and counted in the report. This is what makes the
   Sonnet areas safe; the report keeps the count per area so we can see whether they stay safe.
2. **The lead is the only writer.** It applies mechanical fixes: dead paths, a stale count against
   the code, an exact duplicate replaced by a pointer, a gotcha moved to its package file, stale
   status wording. It only **proposes** deletions or rewrites of decisions, plan content or
   `CLAUDE.md` rules; the user approves those.
3. **Full pass at a phase close:** all five areas. Plan-drift corrections in later plans are written
   in place with a dated note (`*Corrected YYYY-MM-DD: was X; as built Y (phase doc § As built).*`);
   `CLAUDE.md` files are corrected in place without notes.
4. **Output:** `docs/cleanup/<date>.md` with fixed · proposed · per-area findings (raised / confirmed
   / dropped) · the script's summary. Commit the fixes with the report:
   `docs: cleanup pass <date>`.
