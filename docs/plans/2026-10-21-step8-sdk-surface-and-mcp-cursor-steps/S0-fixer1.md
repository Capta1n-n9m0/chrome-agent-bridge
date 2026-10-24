# S0 fixer, round 1 (2026-10-23)

Fixer for Step 8 stage S0, on uncommitted work over HEAD 1837dc9. Scope: V4, V10, V6, V2, V3, V11 from
`S0-verifier.md`. Nothing else was touched; nothing was committed or built.

## Per finding

**V4 — fixed.** `shared/test/protocol-step8.test.ts`: a new `it` block, "Locator: each variant's own
keys, pinned on the extracted member (S0 verifier V4)". It takes `RoleArm`/`TextArm`/`CssArm` with
`Extract<Locator, {role|text|css: string}>` and pins:
- `RoleArm["name"]` = `LocatorName | undefined`, `RoleArm["exact"]` and `TextArm["exact"]` =
  `boolean | undefined`, `nth` on both = `number | undefined` (`expectTypeOf…toEqualTypeOf`);
- `keyof` of each arm exactly: role `"role"|"name"|"exact"|"nth"`, text `"text"|"exact"|"nth"`,
  css `"css"|"nth"`;
- `is<TextArm>({text:"x", exact:true})` and `is<RoleArm>({role, name, exact})` compile;
- `@ts-expect-error` on `is<TextArm>({text, name})`, `is<CssArm>({css, exact:true})`,
  `is<CssArm>({css, name})`.

Proof: each mutation of `shared/src/protocol.ts`, then `npx tsc -p shared/tsconfig.json --noEmit`, then
restore from a copy. Original sha256 `50303527332d05877b06b4bb22ebbd0ffd2756e0c86dd85172352b6877aa8e00`;
after every restore the same sha256 was printed. Baseline: no output, exit 0.

| Mutation | tsc result (abridged) |
|---|---|
| M1 `exact` dropped from text arm | exit 2: TS2339 `Property 'exact' does not exist on type '{ text: string; nth?: … }'` (:163); TS2344 on `keyof TextArm` (:166); TS2353 `'exact' does not exist` (:169) |
| M2 `exact?: boolean` added to css arm | exit 2: TS2344 on `keyof CssArm` (`Actual: literal string: exact`) (:167); TS2578 unused `@ts-expect-error` (:172) |
| M3 `name?: LocatorName` added to css arm | exit 2: TS2344 on `keyof CssArm` (`Actual: literal string: name`) (:167); TS2578 (:174) |
| M4 `name` dropped from role arm | exit 2: TS2353 ×6 (:111, :112, :144, :145, :168, :207); TS2339 `Property 'name' does not exist` (:160); TS2344 on `keyof RoleArm` (:165) |
| M5 `exact` dropped from role arm | exit 2: TS2339 `Property 'exact' does not exist` (:161); TS2344 (:165); TS2353 (:168) |
| M6 `name?: LocatorName` added to text arm | exit 2: TS2344 on `keyof TextArm` (`Actual: literal string: name`) (:166); TS2578 (:170) |

M1 is the verifier's uncaught mutation; M2 is the one the builder called "cannot reject" (on the whole
union it still cannot; on the extracted member it now is).

**V10 — fixed.** `shared/src/error.ts:34`: "a code outside the 22 is kept as a string" → "a code outside
`ErrorCodes` is kept as a string". Comment only (`git diff --numstat`: 1 1).

**V6 + V2 — fixed.** Phase doc, Stage S0, right after the "*Stage 0 notes:*" clause (F27/F28): a
"*Built 2026-10-23 (S0 step agent): F27 as proposed … F28 as proposed …*" note with the text given in
the brief (F27 mechanical; F28 design-local, proposed in S0.md for the session agent to record). V2's
"Ruled" note and the code-comment citation still wait for the session agent's decision.

**V3 — fixed (proposal recorded).** Phase doc §0.1, after the #83 Superseded note, before §0.2: a
"*Proposed 2026-10-23 (S0 step agent, for the session agent to record): `nth` is 0-based …*" note. Still
needs a session-agent ruling before S1.

**V11 — fixed.** Phase doc, Stage S6 SDK-1, right after the #85 ruling note: a "*Ruled 2026-10-23
(session agent, decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls
without `tab` stay "active" (#81)): S2b does not remove the Chrome `id` from `newTab`/`listTabs`
results, so the "if S2b removes the Chrome `id`" branch does not arise this step. …*" note. The
operative wording matches #81's **Decided** line (decisions.md:121).

Phase doc against HEAD: `git diff --numstat` → 300 added, 0 deleted, so no lines were deleted.

## Gates

- `npm run typecheck` → exit 0.
- `npx vitest run shared/` → Test Files 6 passed (6); Tests 141 passed (141).
- `npm test` → Test Files 60 passed (60); Tests 1008 passed (1008) (1007 + the new V4 block).

## Files touched

- `shared/test/protocol-step8.test.ts` (V4)
- `shared/src/error.ts` (V10)
- `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md` (V6+V2, V3, V11)
- `shared/src/protocol.ts`: mutated and restored only, sha256 unchanged.
