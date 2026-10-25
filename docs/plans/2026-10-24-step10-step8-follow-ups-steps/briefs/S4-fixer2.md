# S4 fixer brief, round 2 (sent as the agent prompt, kept here verbatim in substance)

Read briefs/S4-fixer1.md in full (its preamble rules, verbatim inputs, ESCALATION list, SPEC-DISCREPANCY PROTOCOL,
INTEGRITY FLOOR and LESSONS bind), then CLAUDE.md, then "Re-check, round 1" of S4-verifier.md. Do not spawn agents,
commit or use git stash; finish in one go.

Fix ONLY finding R1-1 (MINOR): in sdk/src/evaluate-save.ts, finishSave swallows a failed removal of <path>.part after
a successful hard link, and the caller then sets partLeft = false, so <path>.part could remain as a second name holding
the whole value (#207). Make partLeft false only once the .part is really gone; retry a failed removal in the finally;
if it still cannot be removed, fail the save with a clear error (keep or remove the saved file — choose and justify),
never report success while a .part remains. Keep the overwrite:true rename path and the link-unsupported fallback
unchanged. Test first (red then green). Run typecheck, test (before 3142/130), build; no tracked change from the build.
Write S4-fixer2.md.
