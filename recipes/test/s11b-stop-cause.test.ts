// S4-live fixer 4: an unexpected throw's STOP names its cause safely (code, history step, a message only when it passes the filter).
import { BridgeError } from "@bridge/shared/error";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cmds, main } from "../s11b";
import { K17, safeMessage17, unexpectedStop17, type Scan17Ctx } from "../s11b-rules";

const ctx: Scan17Ctx = { token: "tok3n-secret", sentinel: "sentinel-x9", profile: ["C:\\Users\\someone"], alias: "alias7.localhost" };
const known = new Set(Object.values(K17).map((k) => k.message));
const stopOf = (e: unknown, step?: string): string => unexpectedStop17(e, { ctx, known, step });

describe("unexpectedStop17", () => {
  it("prints a BridgeError's code, its step and a plain message; never data", () => {
    const s = stopOf(new BridgeError("INTERNAL", "Cannot find a next page in history.", { url: "http://x.example/" }), "back 1");
    expect(s).toBe('unexpected BridgeError INTERNAL at=back 1 "Cannot find a next page in history."');
  });
  it("prints a sheet text as it is", () => {
    const k = Object.values(K17)[0]!;
    expect(stopOf(new BridgeError(k.code, k.message))).toBe(`unexpected BridgeError ${k.code} "${k.message}"`);
  });
  const denied: Array<[string, string]> = [
    ["a URL", "Timed out loading http://localhost:8081/x"],
    ["a scheme-only URL", "bad chrome-extension://abc"],
    ["localhost:8085", "blocked localhost:8085 hit"],
    ["an a-run", `x ${"a".repeat(24)} y`],
    ["bank.example", "host bank.example refused"],
    ["the alias", "met alias7.localhost"],
    ["the sentinel", "folder sentinel-x9 missing"],
    ["the token", "bad tok3n-secret here"],
    ["a long token-like run", `token ${"f0".repeat(16)}`],
    ["a Windows path", "no file at C:\\Users\\someone\\x.bin"],
    ["a POSIX path", "no file at /tmp/x"],
    ["non-ASCII", "naïve message"],
    ["an over-long text", "x ".repeat(120)],
  ];
  it.each(denied)("withholds a message carrying %s, by length", (_w, m) => {
    expect(safeMessage17(m, ctx)).toBe(false);
    expect(stopOf(new BridgeError("NAV_FAILED", m), "navigate 3")).toBe(`unexpected BridgeError NAV_FAILED at=navigate 3 <message withheld len=${m.length}>`);
  });
  it("names a code outside the enum by its length only", () => {
    expect(stopOf(new BridgeError("http://x.example/", "ok text"))).toBe('unexpected BridgeError <code len=17> "ok text"');
  });
  it("keeps the constructor name for any other throw, with the step", () => {
    expect(stopOf(new TypeError("at C:\\secret"), "claim")).toBe("unexpected TypeError at=claim");
    expect(stopOf("str")).toBe("unexpected throw");
  });
});

describe("main's catch", () => {
  let out: string[] = [];
  let spy: ReturnType<typeof vi.spyOn>;
  beforeAll(() => {
    spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => void out.push(a.join(" ")));
  });
  afterAll(() => {
    spy.mockRestore();
    delete cmds["__throw"];
  });
  it("prints the filtered cause and exits 2", async () => {
    cmds["__throw"] = () => {
      throw new BridgeError("TAB_HELD", "Tab T7 is held by another client");
    };
    expect(await main(["__throw"])).toBe(2);
    expect(out.join("\n")).toBe('STOP: unexpected BridgeError TAB_HELD "Tab T7 is held by another client"');
    out = [];
    cmds["__throw"] = () => {
      throw new BridgeError("NAV_FAILED", "net::ERR at http://localhost:8091/h/fwd?s11b=fw", { error: "x" });
    };
    expect(await main(["__throw"])).toBe(2);
    expect(out.join("\n")).toBe("STOP: unexpected BridgeError NAV_FAILED <message withheld len=47>");
  });
});
