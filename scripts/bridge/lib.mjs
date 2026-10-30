// @ts-check
// Step 14: the pure logic of `npm run setup` (and, from S2b, doctor and update). Node built-ins only: setup runs
// before `npm ci`. Nothing here reads a file, spawns a process or holds a token value (#427-#429).
import path from "node:path";

export const SERVER_NAME = "chrome-agent-bridge";
export const PORT = 9234;
export const MIN_NODE_MAJOR = 20; // docs/setup.md Prerequisites; no `engines` field in package.json
/** npm runs these on its own (`npm ci` among them): no root script may take one (Stage0.md C1). */
export const LIFECYCLE_NAMES = [
  "preinstall", "install", "postinstall", "prepublish", "preprepare", "prepare", "postprepare",
  "prepack", "postpack", "publish", "dependencies", "update", "preupdate", "postupdate",
];

/** @typedef {{ name: string, level: "ok" | "fail" | "hint", detail: string, fix: string }} Line */

/**
 * @param {{ node: string, npm: string | null, git: string | null, chrome: boolean }} found versions, null = missing
 * @returns {Line[]}
 */
export function checkPrereqs(found) {
  /** @type {(name: string, ok: boolean, bad: "fail" | "hint", detail: string, fix: string) => Line} */
  const line = (name, ok, bad, detail, fix) => ({ name, level: ok ? "ok" : bad, detail, fix: ok ? "" : fix });
  return [
    line("Node.js", Number(found.node.split(".")[0]) >= MIN_NODE_MAJOR, "fail", `v${found.node}`,
      `install Node.js ${MIN_NODE_MAJOR} or newer from nodejs.org, then open a new terminal`),
    line("npm", !!found.npm, "fail", found.npm ?? "not found", "npm comes with Node.js: reinstall Node.js, then open a new terminal"),
    line("git", !!found.git, "fail", found.git ?? "not found", "install Git for Windows from git-scm.com (update uses git pull)"),
    line("Chrome", found.chrome, "hint", found.chrome ? "found" : "not found", "install Google Chrome before loading the extension"),
  ];
}

/** @param {string | null} content the bridge.token file's content, null if missing */
export function tokenDecision(content) {
  return content !== null && content.trim() !== "" ? "keep" : "create";
}

/**
 * `npm ci` only when npm's own record of the tree (node_modules/.package-lock.json) is missing or older than the lock.
 * @param {number} lockMtimeMs @param {number | null} installedMtimeMs
 */
export function installNeeded(lockMtimeMs, installedMtimeMs) {
  return installedMtimeMs === null || installedMtimeMs < lockMtimeMs;
}

/** What `npm run build` writes, and what it reads (files, or folders walked whole), relative to the repo. */
export const BUILD_OUTPUTS = ["daemon/dist/index.js", "mcp/dist/index.js",
  ...["sw", "content", "offscreen", "options"].map((n) => `extension/dist/${n}.js`)];
export const BUILD_INPUTS = ["package.json", "package-lock.json", "tsconfig.base.json", "node_modules/.package-lock.json",
  ...["shared", "daemon", "sdk", "mcp", "extension"].flatMap((w) => ["src", "package.json", "tsconfig.json", "build.mjs"]
    .map((f) => `${w}/${f}`))];

/**
 * Build unless every output exists and is strictly newer than every input (any doubt: build).
 * @param {(number | null)[]} outputMtimes null = missing @param {number[]} inputMtimes
 */
export function buildNeeded(outputMtimes, inputMtimes) {
  if (outputMtimes.length === 0 || inputMtimes.length === 0 || outputMtimes.some((m) => m === null)) return true;
  return Math.max(...inputMtimes) >= Math.min(.../** @type {number[]} */ (outputMtimes));
}

/** @param {Record<string, string | undefined>} env @param {string} homedir */
export function claudeConfigPath(env, homedir) {
  return path.win32.join(env.CLAUDE_CONFIG_DIR || homedir, ".claude.json");
}

/** @param {string} p */
const norm = (p) => path.win32.normalize(p).replace(/\\+$/, "").toLowerCase();

/** @param {string} repo */
export const entryPath = (repo) => path.win32.join(repo, "mcp", "dist", "index.js");

/**
 * What setup does with the user-scope MCP entry, from the parsed `.claude.json`.
 * @param {any} config @param {string} repo
 * @param {{ tokenFile: string | null, replace?: boolean }} opts
 * @returns {{ action: "add" | "leave" | "report" | "replace", existing: string | null, localLeftovers: string[],
 *   envToken: "none" | "same" | "differs" }}
 */
export function mcpDecision(config, repo, opts) {
  const e = config?.mcpServers?.[SERVER_NAME];
  const localLeftovers = Object.entries(config?.projects ?? {})
    .filter(([, p]) => p?.mcpServers?.[SERVER_NAME]).map(([dir]) => dir);
  const envTok = e?.env?.BRIDGE_TOKEN;
  const envToken = typeof envTok !== "string" ? "none" : envTok.trim() === opts.tokenFile?.trim() ? "same" : "differs";
  if (!e) return { action: "add", existing: null, localLeftovers, envToken };
  const args = Array.isArray(e.args) ? e.args : [];
  const existing = String(args.at(-1) ?? e.command ?? "");
  const same = /^node(\.exe)?$/i.test(path.win32.basename(String(e.command ?? ""))) && norm(existing) === norm(entryPath(repo));
  const action = same ? "leave" : opts.replace ? "replace" : "report";
  return { action, existing, localLeftovers, envToken };
}

/** @param {string} repo */
export function mcpAddArgv(repo) {
  return ["mcp", "add", "-s", "user", SERVER_NAME, "--", "node", entryPath(repo)];
}
export const MCP_REMOVE_ARGV = ["mcp", "remove", "-s", "user", SERVER_NAME];

/** A failed part (claude mcp add, an unparsable config) ends setup with exit 2 after the other steps (S2a F2). */
export function finish(/** @type {string[]} */ failedParts) {
  return failedParts.length === 0 ? { code: 0, line: "" }
    : { code: 2, line: `Setup finished, but these parts failed (see above): ${failedParts.join("; ")}.` };
}

/** @param {string} repo @param {{ copied: boolean }} o */
export function nextSteps(repo, o) {
  const tokenFile = path.win32.join(repo, "bridge.token");
  return [
    "Next steps in Chrome:",
    "  1. Open chrome://extensions and turn on Developer mode (top right).",
    `  2. Click "Load unpacked" and choose the folder ${path.win32.join(repo, "extension")}`,
    "  3. Open its Options page (Details > Extension options).",
    `  4. Port: ${PORT}. Token: ${o.copied ? "paste it from the clipboard (Ctrl+V)"
      : `open ${tokenFile} in Notepad and copy its one line (or run npm run setup again to copy it)`}. Save.`,
    "  5. Pin the extension's toolbar button (puzzle-piece menu > pin): it is the kill switch, and so is Alt+Shift+K.",
    "  6. In Claude Code run /mcp (or start a new session); browser_status should say the extension is connected.",
  ].join("\n");
}
