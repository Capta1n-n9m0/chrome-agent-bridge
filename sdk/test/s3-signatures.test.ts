// Step 10 S3.3 (stage0-audit.md F14): every Step 8 SDK signature, pinned by type equality against the
// list as it stood at `f45e3bf` (`sdk/` is unchanged from there to S3's start). The expected types are
// written out literally, never as `typeof` of the thing under test. `npm run typecheck` checks this file
// (`sdk/tsconfig.json` includes `test`); vitest only runs the runtime half.
//
// Exceptions by design (Step 10 phase doc 0.3, amended by Stage 0 F5; decisions.md #117, #206):
// - `LocateResult` gains the optional `pastSnapshotCap?: true` (its other three fields are unchanged);
// - `BridgeClient.on` gains one overload, `on("warning", (w: BridgeWarning) => …)`.
// The eight exported values are pinned at runtime by `sdk/test/index.test.ts`.
import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  ExtensionStatusParams,
  EventMessage,
  LeaseGrantedParams,
  LocateResult,
  Locator,
  NetworkEntry,
  SafetyState,
  SafetyStatusParams,
  SnapshotResult,
  TabGoneParams,
  WaitForParams,
  WelcomeMessage,
} from "@bridge/shared";
import { BridgeClient, type BridgeClientOptions, type CallOptions, type TabInfo } from "../src/client.js";
import type { ConnectOptions } from "../src/connect.js";
import type { DownloadOutcome } from "../src/download.js";
import type { Target } from "../src/locator.js";
import type {
  DownloadOptions,
  NetworkListOptions,
  ScreenshotOptions,
  ScrollOptions,
  Tab,
  TrustedOption,
} from "../src/tab.js";
import type * as Sdk from "../src/index.js";

type Screenshot = {
  (options: ScreenshotOptions & { path: string }): Promise<string>;
  (options?: Omit<ScreenshotOptions, "path">): Promise<Buffer>;
};

describe("S3.3 the Step 8 SDK signatures are unchanged (type equality; checked by tsc)", () => {
  it("connect", () => {
    expectTypeOf<typeof Sdk.connect>().toEqualTypeOf<(options: ConnectOptions) => Promise<BridgeClient>>();
  });

  it("Tab: every public member", () => {
    expectTypeOf<Tab["handle"]>().toEqualTypeOf<string>();
    expectTypeOf<Tab["navigate"]>().toEqualTypeOf<(url: string) => Promise<void>>();
    expectTypeOf<Tab["back"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<Tab["forward"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<Tab["snapshot"]>().toEqualTypeOf<() => Promise<SnapshotResult>>();
    expectTypeOf<Tab["screenshot"]>().toEqualTypeOf<Screenshot>();
    expectTypeOf<Tab["click"]>().toEqualTypeOf<(target: Target, options?: TrustedOption) => Promise<void>>();
    expectTypeOf<Tab["type"]>().toEqualTypeOf<
      (target: Target, text: string, options?: TrustedOption & { submit?: boolean }) => Promise<void>
    >();
    expectTypeOf<Tab["pressKey"]>().toEqualTypeOf<(key: string, options?: TrustedOption) => Promise<void>>();
    expectTypeOf<Tab["hover"]>().toEqualTypeOf<(target: Target) => Promise<void>>();
    expectTypeOf<Tab["scroll"]>().toEqualTypeOf<(options?: ScrollOptions) => Promise<void>>();
    expectTypeOf<Tab["selectOption"]>().toEqualTypeOf<(target: Target, values: string[]) => Promise<void>>();
    expectTypeOf<Tab["locate"]>().toEqualTypeOf<(locator: Locator) => Promise<LocateResult>>();
    expectTypeOf<Tab["waitFor"]>().toEqualTypeOf<(p: WaitForParams) => Promise<void>>();
    expectTypeOf<Tab["evaluate"]>().toEqualTypeOf<
      <T = unknown>(expression: string, options?: { timeoutMs?: number }) => Promise<T>
    >();
    expectTypeOf<Tab["evaluateRef"]>().toEqualTypeOf<(expression: string) => Promise<string>>();
    expectTypeOf<Tab["network"]>().toEqualTypeOf<
      (options?: NetworkListOptions | { id: string }) => Promise<NetworkEntry[]>
    >();
    expectTypeOf<Tab["networkClear"]>().toEqualTypeOf<() => Promise<number>>();
    expectTypeOf<Tab["download"]>().toEqualTypeOf<
      (url: string, filePath: string, options?: DownloadOptions) => Promise<DownloadOutcome>
    >();
    expectTypeOf<Tab["focus"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<Tab["close"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<Tab["release"]>().toEqualTypeOf<() => Promise<void>>();
  });

  it("BridgeClient: every public member but on", () => {
    expectTypeOf<BridgeClient["welcome"]>().toEqualTypeOf<WelcomeMessage | null>();
    expectTypeOf<BridgeClient["extensionConnected"]>().toEqualTypeOf<boolean>();
    expectTypeOf<BridgeClient["connect"]>().toEqualTypeOf<() => Promise<WelcomeMessage>>();
    expectTypeOf<BridgeClient["call"]>().toEqualTypeOf<
      (method: string, params?: Record<string, unknown>, options?: CallOptions) => Promise<unknown>
    >();
    expectTypeOf<BridgeClient["status"]>().toEqualTypeOf<() => Promise<unknown>>();
    expectTypeOf<BridgeClient["safety"]>().toEqualTypeOf<() => Promise<SafetyState | null>>();
    expectTypeOf<BridgeClient["newTab"]>().toEqualTypeOf<(url?: string, options?: { active?: boolean }) => Promise<Tab>>();
    expectTypeOf<BridgeClient["claim"]>().toEqualTypeOf<(target: string | { active: true }) => Promise<Tab>>();
    expectTypeOf<BridgeClient["tab"]>().toEqualTypeOf<() => Tab>();
    expectTypeOf<BridgeClient["tabs"]>().toEqualTypeOf<() => Promise<TabInfo[]>>();
    expectTypeOf<BridgeClient["navigate"]>().toEqualTypeOf<(url: string) => Promise<void>>();
    expectTypeOf<BridgeClient["back"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<BridgeClient["forward"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<BridgeClient["snapshot"]>().toEqualTypeOf<() => Promise<SnapshotResult>>();
    expectTypeOf<BridgeClient["screenshot"]>().toEqualTypeOf<Screenshot>();
    expectTypeOf<BridgeClient["click"]>().toEqualTypeOf<(target: Target, options?: TrustedOption) => Promise<void>>();
    expectTypeOf<BridgeClient["type"]>().toEqualTypeOf<
      (target: Target, text: string, options?: TrustedOption & { submit?: boolean }) => Promise<void>
    >();
    expectTypeOf<BridgeClient["pressKey"]>().toEqualTypeOf<(key: string, options?: TrustedOption) => Promise<void>>();
    expectTypeOf<BridgeClient["hover"]>().toEqualTypeOf<(target: Target) => Promise<void>>();
    expectTypeOf<BridgeClient["scroll"]>().toEqualTypeOf<(options?: ScrollOptions) => Promise<void>>();
    expectTypeOf<BridgeClient["selectOption"]>().toEqualTypeOf<(target: Target, values: string[]) => Promise<void>>();
    expectTypeOf<BridgeClient["locate"]>().toEqualTypeOf<(locator: Locator) => Promise<LocateResult>>();
    expectTypeOf<BridgeClient["waitFor"]>().toEqualTypeOf<(p: WaitForParams) => Promise<void>>();
    expectTypeOf<BridgeClient["evaluate"]>().toEqualTypeOf<
      <T = unknown>(expression: string, options?: { timeoutMs?: number }) => Promise<T>
    >();
    expectTypeOf<BridgeClient["evaluateRef"]>().toEqualTypeOf<(expression: string) => Promise<string>>();
    expectTypeOf<BridgeClient["network"]>().toEqualTypeOf<
      (options?: NetworkListOptions | { id: string }) => Promise<NetworkEntry[]>
    >();
    expectTypeOf<BridgeClient["networkClear"]>().toEqualTypeOf<() => Promise<number>>();
    expectTypeOf<BridgeClient["download"]>().toEqualTypeOf<
      (url: string, path: string, options?: DownloadOptions) => Promise<DownloadOutcome>
    >();
    expectTypeOf<BridgeClient["focus"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<BridgeClient["release"]>().toEqualTypeOf<() => Promise<void>>();
    expectTypeOf<BridgeClient["close"]>().toEqualTypeOf<() => void>();
  });

  it("the BridgeClient constructor and the option shapes TrustedOption and ScrollOptions (as at f45e3bf)", () => {
    // S3 fixer 1 (verifier finding 3): the exported value's constructor, and the two option types this
    // stage could plausibly touch, written out literally from `git show f45e3bf:sdk/src/tab.ts`.
    expectTypeOf<ConstructorParameters<typeof BridgeClient>>().toEqualTypeOf<[BridgeClientOptions]>();
    expectTypeOf<TrustedOption>().toEqualTypeOf<{ trusted?: boolean }>();
    expectTypeOf<ScrollOptions>().toEqualTypeOf<{ target?: Target; direction?: "up" | "down" }>();
  });

  it("LocateResult: by design it gains pastSnapshotCap?: true; ref, role and name are unchanged", () => {
    // Exception by design (#117, #206): the one new, optional field.
    expectTypeOf<LocateResult>().toEqualTypeOf<{ ref: string; role: string; name: string; pastSnapshotCap?: true }>();
    expectTypeOf<Omit<LocateResult, "pastSnapshotCap">>().toEqualTypeOf<{ ref: string; role: string; name: string }>();
  });

  it("BridgeClient.on: every Step 8/9 overload still takes its listener; by design one new overload, warning", () => {
    const client = new BridgeClient({ knock: async () => Promise.reject(new Error("never called")) });
    expectTypeOf(client.on).toBeCallableWith("event", (_e: EventMessage) => {});
    expectTypeOf(client.on).toBeCallableWith("reconnected", (_w: WelcomeMessage) => {});
    expectTypeOf(client.on).toBeCallableWith("tabGone", (_p: TabGoneParams) => {});
    expectTypeOf(client.on).toBeCallableWith("leaseGranted", (_p: LeaseGrantedParams) => {});
    expectTypeOf(client.on).toBeCallableWith("extensionStatus", (_p: ExtensionStatusParams) => {});
    expectTypeOf(client.on).toBeCallableWith("safetyStatus", (_p: SafetyStatusParams) => {});
    // Each overload returns an unsubscribe.
    const off = client.on("tabGone", () => {});
    expectTypeOf(off).toEqualTypeOf<() => void>();
    off();
    // Exception by design (#206): the new overload; its payload is exactly these three keys.
    const offWarning = client.on("warning", (w) => {
      expectTypeOf(w).toEqualTypeOf<{ tab: string; method: string; kind: "pastSnapshotCap" }>();
    });
    expectTypeOf(offWarning).toEqualTypeOf<() => void>();
    offWarning();
    expect(typeof offWarning).toBe("function");
  });
});
