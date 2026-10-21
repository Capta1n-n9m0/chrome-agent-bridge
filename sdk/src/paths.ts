// Where the daemon the SDK would spawn lives (phase-doc 0.5 as amended by stage0-audit F2):
// `<workspace root>/daemon/dist/index.js`, found by the same walk-up as `bridge.token`;
// `BRIDGE_DAEMON` overrides it. A missing file is an error before any knock.
import { statSync } from "node:fs";
import path from "node:path";
import { findWorkspaceRoot, moduleDir } from "./token.js";

export interface ResolveDaemonPathOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  startDir?: string;
  /** Only used to word the Git-Bash-path hint (F24). Default: `process.platform`. */
  platform?: NodeJS.Platform;
  isFile?: (p: string) => boolean;
}

function defaultIsFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

export function resolveDaemonPath(options: ResolveDaemonPathOptions = {}): string {
  const env = options.env ?? process.env;
  const startDir = options.startDir ?? moduleDir();
  const platform = options.platform ?? process.platform;
  const isFile = options.isFile ?? defaultIsFile;

  const override = env.BRIDGE_DAEMON?.trim();
  if (override) {
    const p = path.resolve(override);
    if (isFile(p)) return p;
    let message =
      `daemon not built — run \`npm run build\` (looked for ${p}, from BRIDGE_DAEMON; ` +
      "unset it to use the workspace's daemon/dist/index.js)";
    if (platform === "win32" && /^\/[a-zA-Z](\/|$)/.test(override)) {
      message += ` — BRIDGE_DAEMON looks like a Git Bash path (${override}); use a native Windows path such as C:\\…`;
    }
    throw new Error(message);
  }

  const root = findWorkspaceRoot(startDir);
  if (root === null) {
    throw new Error(
      `daemon not found: no workspace root found above ${path.resolve(startDir)} ` +
        "(set BRIDGE_DAEMON to the daemon's dist/index.js)",
    );
  }
  const p = path.join(root, "daemon", "dist", "index.js");
  if (!isFile(p)) throw new Error(`daemon not built — run \`npm run build\` (looked for ${p})`);
  return p;
}
