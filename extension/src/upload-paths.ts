/**
 * Step 11 S2: the upload-folder matcher (phase doc `docs/plans/2026-10-25-step11-file-upload.md` 0.4 with its
 * Stage 0 note; decisions.md · 2026-10-25 · Step 11: upload folders are a human-held allow-list in the extension,
 * empty by default (#236); · Stage 0: matcher details — a POSIX path with a backslash is refused; ASCII-only case
 * folding (#249)). Pure: no `chrome.*`, no log call. The gate (`safety.ts`) and, from S3, the options page share it.
 * Its case table is `extension/test/upload-paths.test.ts` (Stage 0's 74 rows plus the verifier's and #249's).
 *
 * A path is allowed when its shape is well formed (no refusal class below) and it lies **strictly inside** a valid
 * folder of the same style, segment by segment — never by bare string prefix, so `C:\Up\x` is not inside
 * `C:\Uploads`. Windows paths (`X:\…`, `/` read as `\`) compare ASCII letters case-insensitively and every other
 * character exactly; POSIX paths (`/…`) compare exactly. Nothing is resolved, trimmed or normalised beyond
 * reading `/` as `\` in a Windows path: anything ambiguous is refused (fails closed).
 *
 * Refusal classes (`uploadPathRefusalClass`): NOTSTRING, EMPTY, LONG (> 4096 chars), CTRL (C0, DEL, C1), PAD
 * (leading/trailing whitespace), PREFIX (`\\?\`, `\\.\`, `\??\` and their `/` forms), UNC (`\\server`, `//server`),
 * RELATIVE (no drive or root, a drive-relative `C:x`, a URL), BACKSLASH (a POSIX path holding `\`), EMPTYSEG (a
 * doubled separator), TRAILSEP (ends with a separator: a folder, not a file), DOTSEG (a `.` or `..` segment), ADS
 * (a `:` after the drive), BADCHAR (`<>"|?*` in a Windows path), DOTSPACE (a Windows segment ending in `.` or a
 * space), DEVICE (a reserved DOS device name as a Windows segment's stem).
 *
 * Never log a path or a folder from here (phase doc 0.10).
 */

import { UPLOAD_FILES_MAX_PATHS } from "@bridge/shared";

/** At most this many paths in one `uploadFiles` call (phase doc 0.6; S2's build decision; the wire's constant). */
export const UPLOAD_MAX_PATHS = UPLOAD_FILES_MAX_PATHS;
/** A path or folder line longer than this is refused (Stage 0 F10, class LONG). */
export const UPLOAD_MAX_PATH_CHARS = 4096;

export type UploadPathClass =
  | "NOTSTRING"
  | "EMPTY"
  | "LONG"
  | "CTRL"
  | "PAD"
  | "PREFIX"
  | "UNC"
  | "RELATIVE"
  | "BACKSLASH"
  | "EMPTYSEG"
  | "TRAILSEP"
  | "DOTSEG"
  | "ADS"
  | "BADCHAR"
  | "DOTSPACE"
  | "DEVICE";

/** A well-formed absolute path or folder, as segments (Windows: the drive letter upper case). */
export type ParsedUploadPath =
  | { style: "win"; drive: string; segments: readonly string[] }
  | { style: "posix"; segments: readonly string[] };

export type UploadFolderLine =
  | { kind: "ignored"; text: string }
  | { kind: "invalid"; text: string; home?: true }
  | { kind: "valid"; text: string; folder: ParsedUploadPath };

/** A parsed folder list. `lines` keeps every input line in order (for the options page, S3). */
export interface UploadFolders {
  lines: readonly UploadFolderLine[];
  folders: readonly ParsedUploadPath[];
  /** The number of valid folders. */
  count: number;
}

/** No folder: every upload is refused (the default, #236). */
export const EMPTY_UPLOAD_FOLDERS: UploadFolders = Object.freeze({
  lines: Object.freeze([]) as readonly UploadFolderLine[],
  folders: Object.freeze([]) as readonly ParsedUploadPath[],
  count: 0,
});

// C0 controls, DEL and C1 controls.
// eslint-disable-next-line no-control-regex
const CTRL_RE = /[\u0000-\u001F\u007F-\u009F]/;
const PAD_RE = /^\s|\s$/u;
const WIN_ABS_RE = /^[A-Za-z]:[\\/]/;
const WIN_DRIVE_RE = /^[A-Za-z]:/;
const WIN_BADCHAR_RE = /[<>"|?*]/;
/** Reserved DOS device names (the stem before the first `.`, trailing dots and spaces removed). */
const DEVICE_RE = /^(?:CON|PRN|AUX|NUL|COM[0-9¹²³]|LPT[0-9¹²³]|CONIN\$|CONOUT\$)$/i;

type Shape = { ok: ParsedUploadPath } | { refused: UploadPathClass };

function refused(c: UploadPathClass): Shape {
  return { refused: c };
}

/** The segments after the root, with the generic segment checks (EMPTYSEG, TRAILSEP, DOTSEG). */
function splitSegments(rest: string, sep: RegExp): string[] | UploadPathClass {
  const segs = rest.split(sep);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    if (s === "") return i === segs.length - 1 ? "TRAILSEP" : "EMPTYSEG";
    if (s === "." || s === "..") return "DOTSEG";
  }
  return segs;
}

/** Windows-only checks of one segment, in order: ADS, BADCHAR, DOTSPACE, DEVICE. */
function winSegmentClass(s: string): UploadPathClass | null {
  if (s.includes(":")) return "ADS";
  if (WIN_BADCHAR_RE.test(s)) return "BADCHAR";
  if (s.endsWith(".") || s.endsWith(" ")) return "DOTSPACE";
  const dot = s.indexOf(".");
  const stem = (dot === -1 ? s : s.slice(0, dot)).replace(/[. ]+$/, "");
  if (DEVICE_RE.test(stem)) return "DEVICE";
  return null;
}

/** The shape of one path or folder: its segments, or the first refusal class. */
function shapeOf(value: unknown): Shape {
  if (typeof value !== "string") return refused("NOTSTRING");
  const p = value;
  if (p === "") return refused("EMPTY");
  if (p.length > UPLOAD_MAX_PATH_CHARS) return refused("LONG");
  if (CTRL_RE.test(p)) return refused("CTRL");
  if (PAD_RE.test(p)) return refused("PAD");
  if (/^[\\/][\\/][?.][\\/]/.test(p) || p.startsWith("\\??\\")) return refused("PREFIX");
  if (/^[\\/][\\/]/.test(p)) return refused("UNC");

  if (WIN_ABS_RE.test(p)) {
    const drive = p[0]!.toUpperCase();
    const segs = splitSegments(p.slice(3), /[\\/]/);
    if (typeof segs === "string") return refused(segs);
    for (const s of segs) {
      const c = winSegmentClass(s);
      if (c !== null) return refused(c);
    }
    return { ok: { style: "win", drive, segments: segs } };
  }
  if (WIN_DRIVE_RE.test(p)) return refused("RELATIVE"); // `C:x`: relative to the drive's current directory
  if (p.startsWith("/")) {
    if (p.includes("\\")) return refused("BACKSLASH"); // #249: never normalised on POSIX
    const segs = splitSegments(p.slice(1), /\//);
    if (typeof segs === "string") return refused(segs);
    return { ok: { style: "posix", segments: segs } };
  }
  return refused("RELATIVE");
}

/** The refusal class of a path by its shape alone, or null when well formed (it may still be outside). */
export function uploadPathRefusalClass(path: unknown): UploadPathClass | null {
  const s = shapeOf(path);
  return "refused" in s ? s.refused : null;
}

/** One line of the options page's Upload folders box. */
export function parseUploadFolderLine(text: string): UploadFolderLine {
  if (text.trim() === "" || text.startsWith("#")) return { kind: "ignored", text };
  const invalid: UploadFolderLine = { kind: "invalid", text };
  if (PAD_RE.test(text)) return invalid; // never trimmed: a folder is taken exactly as typed
  // One trailing separator is allowed on a folder line (`D:\Data\Shared\`, `/srv/drop/`). A trailing `\` is a
  // separator only on a drive-letter line: on a POSIX line it stays, so BACKSLASH refuses it (#249).
  const trailingSep = text.endsWith("/") || (text.endsWith("\\") && WIN_DRIVE_RE.test(text));
  const body = trailingSep ? text.slice(0, -1) : text;
  const s = shapeOf(body);
  if ("refused" in s) return invalid;
  // A root (`C:\`, `/`) never parses as a folder here: its body is `C:` (RELATIVE) or `` (EMPTY).
  // Step 11b S0F-a (#288 3b): a home folder, or a folder holding homes, is invalid here, so the options page and the
  // gate's matcher (which parses the stored text with this same function) both refuse it: fails closed.
  if (isHomeFolder(s.ok)) return { kind: "invalid", text, home: true };
  return { kind: "valid", text, folder: s.ok };
}

// --- Home folders (Step 11b S0F-a; decisions.md #288 item 3b, #296; stage0-audit.md §5) ---------------------------
// A parent of homes, as ASCII-folded segments: a folder equal to one, or one segment below one, is a home folder.
const POSIX_HOME_PARENTS: readonly (readonly string[])[] = [
  ["home"],
  ["users"],
  ["var", "home"], // `/home` links here on Fedora Atomic
  ["system", "volumes", "data", "users"], // the macOS firmlink of `/Users`
];
/** Root's home folders: refused exactly (a folder inside one stays allowed). */
const POSIX_ROOT_HOMES: readonly (readonly string[])[] = [["root"], ["var", "root"], ["private", "var", "root"]];
/** `Users`, `Documents and Settings` and its 8.3 alias `DOCUME~<n>`, on any drive. */
const WIN_HOME_PARENT_RE = /^(?:users|documents and settings|docume~[0-9]+)$/;

function segmentsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

/**
 * Is this folder a home folder or a folder that holds home folders (`X:\Users`, `X:\Users\<name>`, `/home`,
 * `/home/<name>`, `/Users…`, `/root`, …)? ASCII letters compare in any case on both styles (macOS volumes are
 * case-insensitive by default). Pure; never logs. A junction or link elsewhere that points at a home is not seen.
 */
export function isHomeFolder(f: ParsedUploadPath): boolean {
  const segs = f.segments.map(foldAscii);
  if (f.style === "win") return (segs.length === 1 || segs.length === 2) && WIN_HOME_PARENT_RE.test(segs[0]!);
  if (POSIX_ROOT_HOMES.some((h) => segmentsEqual(segs, h))) return true;
  return POSIX_HOME_PARENTS.some(
    (p) => (segs.length === p.length || segs.length === p.length + 1) && segmentsEqual(segs.slice(0, p.length), p),
  );
}

/** The whole box (CRLF, CR or LF). */
export function parseUploadFolders(text: string): UploadFolders {
  const lines = text.split(/\r\n|\r|\n/).map(parseUploadFolderLine);
  const folders = lines.flatMap((l) => (l.kind === "valid" ? [l.folder] : []));
  return { lines, folders, count: folders.length };
}

/** ASCII-only case folding (#249: `toLowerCase` would fold U+212A KELVIN SIGN into `k`). */
function foldAscii(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

/** Is `path` strictly inside `folder`, segment by segment? */
function inside(path: ParsedUploadPath, folder: ParsedUploadPath): boolean {
  if (path.style !== folder.style) return false;
  if (path.segments.length <= folder.segments.length) return false;
  if (path.style === "win" && folder.style === "win") {
    if (path.drive !== folder.drive) return false;
    return folder.segments.every((f, i) => foldAscii(f) === foldAscii(path.segments[i]!));
  }
  return folder.segments.every((f, i) => f === path.segments[i]);
}

/** Is this one path allowed by the folder list? Anything malformed, or no list, is refused. */
export function uploadPathAllowed(path: unknown, folders: UploadFolders | undefined): boolean {
  if (folders === undefined || folders.folders.length === 0) return false;
  const s = shapeOf(path);
  if ("refused" in s) return false;
  return folders.folders.some((f) => inside(s.ok, f));
}

/**
 * The gate's test of `uploadFiles`'s `paths` (#249): an array of 1–`UPLOAD_MAX_PATHS` entries, each a string the
 * folder list allows. Anything else — not an array, empty, too many, a hole, a non-string — is refused.
 */
export function uploadPathsAllowed(paths: unknown, folders: UploadFolders | undefined): boolean {
  if (!Array.isArray(paths)) return false;
  if (paths.length === 0 || paths.length > UPLOAD_MAX_PATHS) return false;
  for (let i = 0; i < paths.length; i++) {
    if (!uploadPathAllowed(paths[i], folders)) return false;
  }
  return true;
}
