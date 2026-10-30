// @ts-check
// `npm run bridge-update [-- --no-reload]`: git pull (fast-forward only), npm ci when needed, build when needed, reload
// the extension by recipes/reload-extension.ps1, then the /mcp hint (Step 14 S2b, #427, #431). Node built-ins only.
// Exits 0 or 1, never 2 (the reload script's exit 2 means "re-run once", #99). It never reads the token.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as lib from "./lib.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const say = (/** @type {string} */ s) => console.log(s);
const stop = (/** @type {string} */ s) => { say(s); process.exit(1); };
/** @param {string} file @param {string[]} argv @param {object} [o] */
const run = (file, argv, o = {}) => spawnSync(file, argv, { cwd: repo, encoding: "utf8", ...o });
const git = (/** @type {string[]} */ argv) => run("git", argv);
const fsIo = { stat: (/** @type {string} */ f) => (existsSync(f) ? statSync(f) : null), list: readdirSync, join: path.join };
const at = (/** @type {string} */ f) => path.join(repo, f);
// npm-cli.js run with this node: no shell and no .cmd shim, so it works under `npm run` and from node directly.
const npmExec = lib.npmCli(process.env, process.execPath, existsSync);
/** @param {string} what @param {string[]} argv */
const npmStep = (what, argv) => {
  say(`${what}: npm ${argv.join(" ")}`);
  if (!npmExec) stop("FAIL: npm-cli.js not found beside node.exe or on PATH: reinstall Node.js from nodejs.org, then run npm run bridge-update.");
  const r = run(process.execPath, [/** @type {string} */ (npmExec), ...argv], { stdio: "inherit" });
  if (r.status !== 0) stop(`FAIL: npm ${argv[0]} failed (above).`);
};

say("== Pull");
const st = git(["status", "--porcelain", "--untracked-files=no"]);
if (st.status !== 0) stop(`STOP: git status failed: ${String(st.stderr).trim()}`);
const head = () => String(git(["rev-parse", "HEAD"]).stdout).trim();
const before = head(), dirty = String(st.stdout).trim() !== "";
const pull = dirty ? null : git(["pull", "--ff-only"]);
if (pull) process.stdout.write(`${pull.stdout}${pull.stderr}`);
const p = lib.pullOutcome({ dirty, code: pull?.status, before, after: head(), output: `${pull?.stdout}${pull?.stderr}` });
if (p.stop) stop(p.line);
say(p.line);

say("\n== Install and build");
if (lib.installNeeded(lib.newestMtime(at("package-lock.json"), fsIo) ?? 0, lib.newestMtime(at("node_modules/.package-lock.json"), fsIo)))
  npmStep("Installing", ["ci", "--no-audit", "--no-fund"]);
else say("node_modules is up to date with package-lock.json: npm ci skipped.");
const inputs = lib.BUILD_INPUTS.map((f) => lib.newestMtime(at(f), fsIo)).filter((m) => m !== null);
if (lib.buildNeeded(lib.BUILD_OUTPUTS.map((f) => lib.newestMtime(at(f), fsIo)), /** @type {number[]} */ (inputs)))
  npmStep("Building", ["run", "build"]);
else say("Every build output is newer than its sources: npm run build skipped.");

say("\n== Reload the extension");
let failed = false;
for (let attempt = 1; ; attempt++) {
  const noReload = process.argv.includes("--no-reload");
  const r = noReload ? null : run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    at("recipes/reload-extension.ps1")], { stdio: "inherit" });
  const step = lib.reloadStep({ noReload, code: r?.status, attempt });
  say(step.line);
  if (step.action !== "retry") { failed = step.action === "fail"; break; }
}
say(`\n${lib.UPDATE_DONE}`);
process.exitCode = failed ? 1 : 0;
