// The snapshot text a model reads, rendered from the extension's structured `snapshot` result
// (Step 7 decision 0.7). Byte-identical to the text `buildSnapshot` built itself up to commit
// 51de800 for the fields that existed then (role, name, ref, disabled): `sdk/test/format-baseline.test.ts`
// compares it with text captured from that commit (#47). The fields T3 added (`value`, `checked`,
// `depth`, `frame`, …) are deliberately not rendered here — doing so would change the transcript.
import type { SnapshotResult } from "@bridge/shared";

/** The extension's element cap (`extension/src/content/snapshot.ts` MAX_LINES); the footer names it. */
export const SNAPSHOT_ELEMENT_CAP = 800;

/**
 * `url: <href>   title: <JSON title>`, then one `- <role> "<name>" [ref=<ref>]` line per element
 * (plus ` [disabled]`), then the truncation footer when the extension hit its cap.
 */
export function formatSnapshot(result: SnapshotResult): string {
  const header = `url: ${result.url}   title: ${JSON.stringify(result.title)}`;
  const lines = result.elements.map(
    (e) => `- ${e.role} "${e.name}" [ref=${e.ref}]${e.disabled ? " [disabled]" : ""}`,
  );
  const footer = result.truncated
    ? `\n- ... truncated at ${SNAPSHOT_ELEMENT_CAP} elements; scroll or narrow the page to see more`
    : "";
  return `${header}\n${lines.join("\n")}${footer}`;
}
