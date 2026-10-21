// Build identity (phase-doc decision 0.5): the sha256 of the daemon bundle, computed once at start
// for the entry's own `process.argv[1]`, sent in every `welcome` and shown by `daemon.status`. The
// SDK's `hashDaemon` computes the same value for the file it would spawn.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** Lowercase sha256 hex of the file's bytes. Throws if the file cannot be read. */
export function buildHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
