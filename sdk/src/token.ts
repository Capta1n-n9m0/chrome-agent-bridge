// The bridge token lookup (phase-doc decision 0.9, spec §9.8): `BRIDGE_TOKEN` env wins, else
// `bridge.token` at the workspace root. The daemon imports this file through the `./token` subpath,
// so it must import node built-ins only — never the client. Never put the token in a message.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TOKEN_FILE = "bridge.token";

type ReadFile = (file: string) => string;

const readUtf8: ReadFile = (file) => readFileSync(file, "utf8");

/**
 * Walks up from `startDir` to the first directory whose `package.json` parses and has a
 * `"workspaces"` field. Stops at the filesystem root (`dirname(dir) === dir`: `C:\`, a UNC root,
 * `/`); returns null if none was found.
 */
export function findWorkspaceRoot(startDir: string, readFile: ReadFile = readUtf8): string | null {
  let dir = path.resolve(startDir);
  for (;;) {
    try {
      const pkg: unknown = JSON.parse(readFile(path.join(dir, "package.json")));
      if (typeof pkg === "object" && pkg !== null && "workspaces" in pkg) return dir;
    } catch {
      // missing or unparsable package.json — keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** This module's own directory: `sdk/src` from source, `mcp/dist` or `daemon/dist` once bundled. */
export function moduleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

export interface ResolveTokenOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  /** Where the workspace-root walk starts. Default: this module's directory. */
  startDir?: string;
}

/**
 * The bridge token. Throws (before any socket is opened) when neither place has one, naming both
 * places; the message never contains a token value.
 */
export function resolveToken(options: ResolveTokenOptions = {}): string {
  const env = options.env ?? process.env;
  const startDir = options.startDir ?? moduleDir();

  const fromEnv = env.BRIDGE_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const root = findWorkspaceRoot(startDir);
  if (root === null) {
    throw new Error(
      `No bridge token: set the BRIDGE_TOKEN environment variable, or put the token in ${TOKEN_FILE} ` +
        `at the workspace root (no workspace root found above ${path.resolve(startDir)}). ` +
        "It must match the token in the extension's Options.",
    );
  }
  const file = path.join(root, TOKEN_FILE);
  let fromFile = "";
  try {
    fromFile = readUtf8(file).trim();
  } catch {
    // missing or unreadable — reported below
  }
  if (fromFile) return fromFile;
  throw new Error(
    `No bridge token: set the BRIDGE_TOKEN environment variable, or put the token in ${file} ` +
      "(missing or empty). It must match the token in the extension's Options.",
  );
}
