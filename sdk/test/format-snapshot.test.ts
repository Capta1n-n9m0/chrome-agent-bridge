// formatSnapshot (Step 7 T4). Two parts:
//  1. the 38 text assertions T3 retired from `extension/test/snapshot.test.ts` (51de800), re-established
//     on the text a model now reads — today's `buildSnapshot` → `formatSnapshot` — with the same
//     fixture documents and the same strings (`T3-builder-report.md` § "Hand-off list", items 1–18);
//  2. the formatter's own rules on hand-built results.
import { describe, it, expect } from "vitest";
import type { SnapshotElement, SnapshotResult } from "@bridge/shared";
import { buildSnapshot } from "../../extension/src/content/snapshot.js";
import { RefMap } from "../../extension/src/content/refmap.js";
import { formatSnapshot } from "../src/format/snapshot.js";
import { SNAPSHOT_FIXTURES } from "./fixtures/capture-baseline.js";
import { withFixtureDocument } from "./fixtures/dom.js";

/** The text a model reads for the 51de800 fixture whose test name ends with `it`. */
function textOf(it: string): string {
  const f = SNAPSHOT_FIXTURES.find((x) => x.name.endsWith(` › ${it}`));
  if (!f) throw new Error(`no fixture named ${it}`);
  return formatSnapshot(withFixtureDocument(f, (doc) => buildSnapshot(doc, new RefMap())));
}

describe("formatSnapshot — the 38 retired snapshot text assertions (hand-off items 1–18)", () => {
  it("1. lists interactive elements with role, accessible name, and ref", () => {
    const text = textOf("lists interactive elements with role, accessible name, and ref");
    expect(text).toContain('textbox "Email" [ref=e1]');
    expect(text).toContain('button "Sign in" [ref=e2]');
    expect(text).toContain('link "Forgot password?" [ref=e3]');
    expect(text).not.toContain("not interactive");
  });

  it("2. skips hidden elements", () => {
    const text = textOf("skips hidden elements");
    expect(text).not.toContain("Hidden");
    expect(text).toContain('button "Shown"');
  });

  it("3. names an input via an associated <label for>", () => {
    expect(textOf("names an input via an associated <label for>")).toContain('textbox "Email address" [ref=e1]');
  });

  it("4. names an input via aria-labelledby", () => {
    expect(textOf("names an input via aria-labelledby")).toContain('textbox "Password"');
  });

  it("5. names an input wrapped in a <label>", () => {
    expect(textOf("names an input wrapped in a <label>")).toContain('textbox "Username"');
  });

  it("6. prefers aria-label over an associated label", () => {
    expect(textOf("prefers aria-label over an associated label")).toContain('textbox "Right"');
  });

  it("7. prunes descendants of a display:none ancestor", () => {
    const text = textOf("prunes descendants of a display:none ancestor");
    expect(text).not.toContain("Buried");
    expect(text).toContain('button "Shown"');
  });

  it("8. prunes an aria-hidden subtree", () => {
    const text = textOf("prunes an aria-hidden subtree");
    expect(text).not.toContain("Decorative");
    expect(text).toContain('button "Real"');
  });

  it("9. prunes an inert subtree", () => {
    const text = textOf("prunes an inert subtree");
    expect(text).not.toContain("Behind modal");
    expect(text).toContain('button "Modal action"');
  });

  it("10. skips zero-size elements when the document reports layout", () => {
    const text = textOf("skips zero-size elements when the document reports layout");
    expect(text).not.toContain("Collapsed");
    expect(text).toContain('button "Visible"');
  });

  it("11. descends into an open shadow root", () => {
    const text = textOf("descends into an open shadow root");
    expect(text).toContain('button "Shadow"');
    expect(text).toContain('button "Light"');
  });

  it("12. descends into a same-origin iframe", () => {
    const text = textOf("descends into a same-origin iframe");
    expect(text).toContain('button "Inner"');
    expect(text).toContain('button "Top"');
  });

  it("13. skips a cross-origin iframe whose document is unreachable", () => {
    expect(textOf("skips a cross-origin iframe whose document is unreachable")).toContain('button "Top"');
  });

  it("14. maps additional native controls", () => {
    const text = textOf("maps additional native controls");
    expect(text).toContain('spinbutton "Qty"');
    expect(text).toContain('slider "Volume"');
    expect(text).toContain('button "Avatar"');
    expect(text).toContain('listbox "Tags"');
    expect(text).toContain('textbox "Body"');
  });

  it("15. passes through explicit interactive ARIA roles", () => {
    const text = textOf("passes through explicit interactive ARIA roles");
    expect(text).toContain('tab "Details"');
    expect(text).toContain('menuitem "Rename"');
    expect(text).toContain('switch "Dark mode"');
    expect(text).toContain('option "Blue"');
  });

  it("16. lets an explicit role override the native mapping", () => {
    const text = textOf("lets an explicit role override the native mapping");
    expect(text).toContain('button "Looks like a button"');
    expect(text).not.toContain("link ");
  });

  it("17. marks disabled controls", () => {
    const text = textOf("marks disabled controls");
    expect(text).toContain('button "Save" [ref=e1] [disabled]');
    expect(text).toContain('button "Cancel" [ref=e2]');
    expect(text).not.toContain('"Cancel" [ref=e2] [disabled]');
  });

  it("18. caps the number of listed elements and says so", () => {
    const text = textOf("caps the number of listed elements and says so");
    expect(text).toContain("truncated");
    expect(text.endsWith("\n- ... truncated at 800 elements; scroll or narrow the page to see more")).toBe(true);
  });
});

function el(over: Partial<SnapshotElement> & Pick<SnapshotElement, "ref" | "role" | "name">): SnapshotElement {
  return { depth: 0, ...over };
}

function result(elements: SnapshotElement[], over: Partial<SnapshotResult> = {}): SnapshotResult {
  return { url: "http://localhost:8080/e2e-playground.html", title: "Agent Bridge E2E Playground", elements, truncated: false, ...over };
}

describe("formatSnapshot — rules", () => {
  it("prints the header with the URL and the JSON-quoted title, then one line per element", () => {
    const out = formatSnapshot(result([el({ ref: "e1", role: "button", name: "Go" }), el({ ref: "e2", role: "link", name: "Home" })]));
    expect(out).toBe(
      'url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"\n' +
        '- button "Go" [ref=e1]\n' +
        '- link "Home" [ref=e2]',
    );
  });

  it("JSON-quotes a title with quotes and backslashes", () => {
    expect(formatSnapshot(result([], { title: 'say "hi" \\ bye' })).split("\n")[0]).toBe(
      'url: http://localhost:8080/e2e-playground.html   title: "say \\"hi\\" \\\\ bye"',
    );
  });

  it("keeps the newline after the header when there are no elements", () => {
    expect(formatSnapshot(result([], { url: "", title: "" }))).toBe('url:    title: ""\n');
  });

  it("marks only disabled:true", () => {
    const out = formatSnapshot(
      result([el({ ref: "e1", role: "button", name: "A", disabled: true }), el({ ref: "e2", role: "button", name: "B", disabled: false })]),
    );
    expect(out).toContain('- button "A" [ref=e1] [disabled]');
    expect(out).toContain('- button "B" [ref=e2]');
    expect(out).not.toContain('"B" [ref=e2] [disabled]');
  });

  it("does not render the fields T3 added (value, checked, expanded, selected, href, depth, frame)", () => {
    const out = formatSnapshot(
      result([
        el({ ref: "e1", role: "textbox", name: "Email", value: "a@b.com", depth: 3, frame: 1 }),
        el({ ref: "e2", role: "checkbox", name: "Agree", checked: true, expanded: true, selected: true }),
        el({ ref: "e3", role: "link", name: "Docs", href: "http://localhost:8080/docs" }),
      ]),
    );
    expect(out.split("\n").slice(1)).toEqual([
      '- textbox "Email" [ref=e1]',
      '- checkbox "Agree" [ref=e2]',
      '- link "Docs" [ref=e3]',
    ]);
  });

  it("adds the truncation footer only when truncated", () => {
    const one = [el({ ref: "e1", role: "button", name: "Go" })];
    expect(formatSnapshot(result(one))).not.toContain("truncated");
    expect(formatSnapshot(result(one, { truncated: true }))).toBe(
      'url: http://localhost:8080/e2e-playground.html   title: "Agent Bridge E2E Playground"\n' +
        '- button "Go" [ref=e1]\n' +
        "- ... truncated at 800 elements; scroll or narrow the page to see more",
    );
  });
});
