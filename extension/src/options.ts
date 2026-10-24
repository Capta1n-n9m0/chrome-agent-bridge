import { SAFETY_KEY_NAMES, parseStoredSafety, touchesSafety, writeSafety, type StoredSafety } from "./safety-state.js";
import { analyzeBlockList, blockListAfterStoredChange, optionsStatus, writeFailedMessage, type SafetyControl } from "./options-model.js";

const portEl = document.getElementById("port") as HTMLInputElement;
const tokenEl = document.getElementById("token") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

chrome.storage.local.get(["port", "token"]).then(({ port, token }) => {
  if (port) portEl.value = String(port);
  if (token) tokenEl.value = String(token);
});

document.getElementById("save")!.addEventListener("click", async () => {
  await chrome.storage.local.set({ port: Number(portEl.value), token: tokenEl.value });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});

// --- Safety (Step 9 S2b) ----------------------------------------------------------------------------------
// The kill switch, the JavaScript switch and the block list (phase doc 0.2, 0.4, 0.5). Each switch saves at
// once on change, never debounced (decisions.md · 2026-10-24 · A re-arm right after a disarm is ignored
// (#144)); the block list saves with its button. Every write goes through `writeSafety` (the key names live in
// `safety-state.ts` only); a failed write is shown and the stored state re-read. Changes made elsewhere (the
// toolbar button, the shortcut, another options tab) arrive through `storage.onChanged`. The line analysis and
// the wording are `options-model.ts` (pure, tested). Nothing here logs.

const armedEl = document.getElementById("armed") as HTMLInputElement;
const evaluateEl = document.getElementById("evaluate") as HTMLInputElement;
const safetyStatusEl = document.getElementById("safety-status") as HTMLParagraphElement;
const safetyErrorEl = document.getElementById("safety-error") as HTMLParagraphElement;
const listEl = document.getElementById("blocklist") as HTMLTextAreaElement;
const listSummaryEl = document.getElementById("blocklist-summary") as HTMLParagraphElement;
const listConflictEl = document.getElementById("blocklist-conflict") as HTMLParagraphElement;
const listErrorEl = document.getElementById("blocklist-error") as HTMLParagraphElement;
const listSavedEl = document.getElementById("blocklist-saved") as HTMLSpanElement;
const invalidEl = document.getElementById("invalid-lines") as HTMLUListElement;

/** The stored block-list text the textarea was last filled from (or saved as). */
let loadedList: string | null = null;

async function readStored(): Promise<StoredSafety | "unreadable"> {
  try {
    return parseStoredSafety(await chrome.storage.local.get([...SAFETY_KEY_NAMES]));
  } catch {
    return "unreadable";
  }
}

function renderAnalysis(): void {
  const a = analyzeBlockList(listEl.value);
  listSummaryEl.textContent = a.summary;
  listEl.setAttribute("aria-invalid", a.invalidCount > 0 ? "true" : "false");
  invalidEl.replaceChildren(
    ...a.invalid.map((l) => {
      const li = document.createElement("li");
      li.textContent = `Line ${l.line}: “${l.text.trim()}” — ${l.reason}`;
      return li;
    }),
  );
}

function render(state: StoredSafety | "unreadable"): void {
  safetyStatusEl.textContent = optionsStatus(state);
  if (state === "unreadable") {
    armedEl.checked = false;
    evaluateEl.checked = false;
    return;
  }
  armedEl.checked = state.armed;
  evaluateEl.checked = state.evaluate;
  if (loadedList === null) {
    listEl.value = state.blockList;
    loadedList = state.blockList;
    listConflictEl.textContent = "";
  } else {
    const next = blockListAfterStoredChange({ current: listEl.value, loaded: loadedList, stored: state.blockList });
    listEl.value = next.text;
    loadedList = next.loaded;
    listConflictEl.textContent = next.conflict
      ? "The saved list was changed elsewhere while you were editing; Save replaces it with the text shown here."
      : "";
  }
  renderAnalysis();
}

async function refreshSafety(): Promise<void> {
  render(await readStored());
}

async function save(control: SafetyControl, change: Partial<StoredSafety>, errorEl: HTMLElement): Promise<boolean> {
  errorEl.textContent = "";
  try {
    await writeSafety((items) => chrome.storage.local.set(items), change);
    return true;
  } catch {
    errorEl.textContent = writeFailedMessage(control);
    await refreshSafety();
    return false;
  }
}

armedEl.addEventListener("change", () => void save("armed", { armed: armedEl.checked }, safetyErrorEl));
evaluateEl.addEventListener("change", () => void save("evaluate", { evaluate: evaluateEl.checked }, safetyErrorEl));

listEl.addEventListener("input", () => renderAnalysis());
document.getElementById("save-blocklist")!.addEventListener("click", async () => {
  const text = listEl.value;
  listSavedEl.textContent = "";
  if (await save("blockList", { blockList: text }, listErrorEl)) {
    loadedList = text;
    listConflictEl.textContent = "";
    listSavedEl.textContent = "Saved.";
    setTimeout(() => (listSavedEl.textContent = ""), 1500);
  }
});

// An <a href="chrome://…"> does not navigate from an extension page; tabs.create does.
document.getElementById("shortcuts")!.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" }).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && touchesSafety(changes)) void refreshSafety();
});

void refreshSafety();
