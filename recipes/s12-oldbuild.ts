// Step 12 S7-helpers-c: the OLD-BUILD SWAP of decisions.md #356 (2) and its RESTORE. Given a commit: a scratch worktree outside the repo with its own
// `npm ci` (never a node_modules junction, #220), its extension build copied over the main tree's gitignored extension/dist/. On success the OLD build
// STAYS in dist (the runner reloads and runs the old-build rows); the runner calls restoreHead() in its own finally at the end of the slice (#356 (2)).
// When a step fails after dist was touched, swapOldBuild itself rebuilds HEAD into dist before it throws, EXCEPT the three worktree-removal throws (WORDING),
// which leave the old build in dist: the runner's finally calls restoreHead for all of them. The worktree is removed with `git worktree remove` only after every
// link in it was removed by `cmd /c rmdir` (a link is never followed by a delete). The reload itself is recipes/reload-extension.ps1, called by the
// runner (S7-helpers-d). Never "Load unpacked", never Chrome pointed at another folder. All I/O is injected (SwapIO); tests never touch the repo.
import { spawnSync } from "node:child_process";
import { cpSync, lstatSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, relative, isAbsolute, resolve } from "node:path";

export interface RunResult { code: number }
export interface SwapIO {
  run(cmd: string, args: string[], cwd: string): RunResult;
  /** every link (symlink / junction / reparse point) under root, never descending into one */
  reparsePoints(root: string): string[];
  /** dist replace: refuses (throws) when dst holds a link; removes dst, copies src to dst */
  replaceDir(src: string, dst: string): void;
}
export interface SwapOpts { repo: string; commit: string; tmp: string }
export interface SwapResult { restored: boolean; worktreeRemoved: boolean; steps: string[] }

const HEX = /^[0-9a-f]{7,40}$/;
export function worktreePath(tmp: string, commit: string): string {
  if (!HEX.test(commit)) throw new Error("swap: the commit must be 7-40 lowercase hex characters");
  return join(tmp, `s12-old-${commit.slice(0, 12)}`);
}
export const distOf = (root: string): string => join(root, "extension", "dist");

/** Removes every link in the worktree with `cmd /c rmdir` (never a recursive delete), then `git worktree remove`; false when a link is left (nothing deleted). */
export function removeWorktree(io: SwapIO, repo: string, wt: string): boolean {
  for (const link of io.reparsePoints(wt)) io.run("cmd", ["/c", "rmdir", link], repo);
  if (io.reparsePoints(wt).length > 0) return false;
  return io.run("git", ["worktree", "remove", "--force", wt], repo).code === 0;
}
/** M1 (S7-helpers-c.md): the three throws that leave the OLD build in dist with no rebuild. The runner calls restoreHead after each (its finally). */
export const WORDING = {
  link: "swap: the scratch worktree could not be removed: a link is left in it, so nothing was deleted; dist holds the old build, no HEAD rebuild ran: call restoreHead (STOP throw-after-state)",
  gitExit: "swap: the scratch worktree could not be removed: git worktree remove exited non-zero (no link is left); dist holds the old build, no HEAD rebuild ran: call restoreHead (STOP throw-after-state)",
  removeThrew: "swap: removing the scratch worktree threw before any HEAD rebuild ran (no restore was attempted); dist holds the old build: call restoreHead (STOP throw-after-state)",
} as const;

const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
/** The swap-in. Success: the old build is in dist and `restored` is false (restoreHead is the runner's). A failure after dist was touched rebuilds HEAD first; throws after the cleanup. */
export function swapOldBuild(io: SwapIO, o: SwapOpts): SwapResult {
  const wt = worktreePath(o.tmp, o.commit);
  const rel = relative(resolve(o.repo), resolve(wt));
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) throw new Error("swap: the worktree path must lie outside the repo");
  const steps: string[] = [];
  let touched = false;
  let restored = false;
  let worktreeRemoved = false;
  let failure: unknown = null;
  const must = (name: string, cmd: string, args: string[], cwd: string): void => {
    steps.push(name);
    if (io.run(cmd, args, cwd).code !== 0) throw new Error(`swap: ${name} failed`);
  };
  let added = false;
  try {
    must("worktree-add", "git", ["worktree", "add", "--detach", wt, o.commit], o.repo);
    added = true;
    must("npm-ci", NPM, ["ci"], wt); // its own node_modules, never a junction
    must("build", NPM, ["run", "build"], wt);
    touched = true; // from here dist may be half changed: the restore runs whatever happens
    steps.push("copy-dist");
    io.replaceDir(distOf(wt), distOf(o.repo));
  } catch (e) {
    failure = e;
  } finally {
    if (touched && failure !== null) {
      steps.push("restore");
      try { restored = io.run(NPM, ["run", "build"], o.repo).code === 0; } catch (e) { restored = false; failure ??= e; }
    }
    if (added) {
      try { worktreeRemoved = removeWorktree(io, o.repo, wt); } catch (e) { failure ??= e; }
      steps.push("worktree-remove");
    }
  }
  if (touched && failure !== null && !restored) throw new Error(steps.includes("restore") ? "swap: the restore (HEAD rebuild) failed: STOP old-build-left-loaded" : WORDING.removeThrew);
  if (failure !== null) throw failure;
  if (added && !worktreeRemoved) throw new Error(io.reparsePoints(wt).length > 0 ? WORDING.link : WORDING.gitExit);
  return { restored, worktreeRemoved, steps };
}
/** The restore (HEAD rebuilt into dist). The runner calls it in its own finally at the end of each old-build slice, after a STOP too. */
export function restoreHead(io: SwapIO, repo: string): boolean { return io.run(NPM, ["run", "build"], repo).code === 0; }

export function realSwapIO(): SwapIO {
  const links = (root: string): string[] => {
    const out: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (lstatSync(p).isSymbolicLink()) out.push(p);
        else if (e.isDirectory()) walk(p);
      }
    };
    if (lstatSync(root, { throwIfNoEntry: false })) walk(root);
    return out;
  };
  return {
    run: (cmd, args, cwd) => ({ code: spawnSync(cmd, args, { cwd, stdio: "ignore", shell: cmd.endsWith(".cmd") }).status ?? 1 }),
    reparsePoints: links,
    replaceDir(src, dst) {
      if (lstatSync(dst, { throwIfNoEntry: false })?.isSymbolicLink() || links(dst).length > 0) throw new Error("swap: dist holds a link; nothing deleted");
      rmSync(dst, { recursive: true, force: true });
      mkdirSync(dst, { recursive: true });
      cpSync(src, dst, { recursive: true });
    },
  };
}
