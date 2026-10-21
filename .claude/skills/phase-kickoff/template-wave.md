# Wave handoff — anatomy

Distilled from the exp3 paper revision loop (2026-08 → 2026-10, `paper/revision-1/handoffs.md`
on `expr`); ported here 2026-10-21. New prompts go to `docs/plans/handoffs.md`, newest first.

## Archive entry

```
## <Short name> — <plain title> (written YYYY-MM-DD; <precondition, e.g. "Step 6 gate closed + decisions ratified">)
```
Then the prompt in one fenced block. **No `>` prefixes** (user preference: copy-friendly).
Short wave names (e.g. "W1", "E2E-7") are fine as labels, but the title says what it is.

## When a wave needs step agents

A wave is done by one session only when it is small: a few targeted edits, no new
behaviour. If it edits code at scale, changes a tool's behaviour, or will not fit one
context, the prompt must run it under the `long-run` contract: the session agent only
orchestrates, one step agent per stage (`step-agent` skill), and every edit is checked by a
fresh verifier that did not write it. A change made after a verifier ran goes back to a
verifier, never a self-check. Each stage commits on its own, and a last checker covers the
whole session diff. Put a **How this session runs** block right after the opening paragraph.

## Prompt sections, in order

1. **Opening** (one paragraph). "Execute <wave> (<plain title>) for <subject>. Working dir: …"
   Then what kind of session this is and its limits: what it may change, what it must not
   (no protocol change / no extension reload / no live E2E / nothing pushed); "No ratified
   decision reopens (see `docs/decisions.md`)"; "anything that needs a major change returns
   to the user". Context-overflow rule: "if context runs short, stop at a clean sub-boundary,
   write the as-built for what landed, and list the remainder."
2. **Read first, in this order** — numbered paths, each with what to take from it
   (sections, decision titles that bind). `CLAUDE.md` gotchas always.
3. **Scope** — numbered items, each concrete: what to produce, from which source, where it
   lands. Split into parts (a)/(b) when the wave is long, with "finish (a) before (b)".
   Flagged defaults: "FLAGGED DEFAULT (execute unless the user objects): …".
4. **Standing constraints** — this repo's never-violate list, pasted: the security boundary
   (`127.0.0.1` bind, token gate) is unchanged; the token is never committed or printed;
   nothing is pushed, tagged or published by the agent; the user's real Chrome profile is
   not driven and the extension is not reloaded unless granted; the repo is public, so no
   private URLs, hostnames or credentials enter docs or fixtures; `CLAUDE.md` stays lean
   (state + pointers + gotchas).
5. **If anything blocks** — record the exact error, surface options with a recommendation,
   stop that branch; never improvise a change to get past a check.
6. **Exit checks** — lettered (a), (b), … each checkable (`npm test` count, typecheck,
   build, a grep that must return nothing, a doc section that must exist).
7. **When done, update statuses** — which plan/roadmap statuses flip; append the as-built
   (format: [`asbuilt.md`](asbuilt.md) § Wave) to the named record doc; run
   `session-closeout`; commit; say what the next session is.

## Lessons carried from the exp3 waves

- Size the wave before writing it: a wave that edits a lot gets step agents and verifiers,
  not a single session.
- Scope waves tightly: blanket "fix everything" mandates balloon.
- Execution sessions sometimes miss scope and say so: read the as-built for what happened,
  not what was asked.
- A closed question must not reopen under another name.
