// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";

describe("buildSnapshot", () => {
  it("lists interactive elements with role, accessible name, and ref", () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Email" />
      <button>Sign in</button>
      <a href="/forgot">Forgot password?</a>
      <p>not interactive</p>
    `;
    const map = new RefMap();
    const { text } = buildSnapshot(document, map);
    expect(text).toContain('textbox "Email" [ref=e1]');
    expect(text).toContain('button "Sign in" [ref=e2]');
    expect(text).toContain('link "Forgot password?" [ref=e3]');
    expect(text).not.toContain("not interactive");
  });

  it("skips hidden elements", () => {
    document.body.innerHTML = `<button style="display:none">Hidden</button><button>Shown</button>`;
    const map = new RefMap();
    const { text } = buildSnapshot(document, map);
    expect(text).not.toContain("Hidden");
    expect(text).toContain('button "Shown"');
  });

  it("returns a refs count matching the listed elements", () => {
    document.body.innerHTML = `<button>A</button><button>B</button>`;
    const map = new RefMap();
    const { count } = buildSnapshot(document, map);
    expect(count).toBe(2);
  });
});
