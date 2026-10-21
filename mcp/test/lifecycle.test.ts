import { describe, it, expect, afterEach, vi } from "vitest";
import { EventEmitter } from "node:events";
import { installLifecycle, isProcessAlive, type LifecycleOptions } from "../src/lifecycle.js";

function setup(overrides: Partial<LifecycleOptions> = {}) {
  const stdin = new EventEmitter();
  const stdout = new EventEmitter();
  const signals = new EventEmitter();
  const shutdown = vi.fn(async (_reason: string) => {});
  const exit = vi.fn((_code: number) => {});
  const lifecycle = installLifecycle({
    stdin,
    stdout,
    signals,
    shutdown,
    exit,
    parentPid: 4242,
    currentParentPid: () => 4242,
    isAlive: () => true,
    pollMs: 1000,
    forceExitMs: 3000,
    ...overrides,
  });
  return { stdin, stdout, signals, shutdown, exit, lifecycle };
}

describe("installLifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shuts down and exits when stdin ends (the MCP client closed the pipe)", async () => {
    const { stdin, shutdown, exit, lifecycle } = setup();
    stdin.emit("end");
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(shutdown).toHaveBeenCalledWith(expect.stringMatching(/stdin/));
    lifecycle.dispose();
  });

  it("shuts down when stdin closes without an 'end'", async () => {
    const { stdin, exit, lifecycle } = setup();
    stdin.emit("close");
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    lifecycle.dispose();
  });

  it("shuts down on a stdout error (EPIPE: nobody is reading any more)", async () => {
    const { stdout, exit, lifecycle } = setup();
    stdout.emit("error", Object.assign(new Error("write EPIPE"), { code: "EPIPE" }));
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    lifecycle.dispose();
  });

  it.each(["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"])("shuts down on %s", async (sig) => {
    const { signals, shutdown, exit, lifecycle } = setup();
    signals.emit(sig);
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(shutdown).toHaveBeenCalledWith(expect.stringContaining(sig));
    lifecycle.dispose();
  });

  it("runs shutdown only once when several triggers fire", async () => {
    const { stdin, signals, shutdown, exit, lifecycle } = setup();
    stdin.emit("end");
    stdin.emit("close");
    signals.emit("SIGTERM");
    await vi.waitFor(() => expect(exit).toHaveBeenCalled());
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    lifecycle.dispose();
  });

  it("shuts down when the parent process is gone (Windows: ppid stays, pid is dead)", async () => {
    vi.useFakeTimers();
    let alive = true;
    const { shutdown, exit, lifecycle } = setup({ isAlive: () => alive });
    await vi.advanceTimersByTimeAsync(2500);
    expect(shutdown).not.toHaveBeenCalled();
    alive = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(shutdown).toHaveBeenCalledWith(expect.stringMatching(/parent/));
    expect(exit).toHaveBeenCalledWith(0);
    lifecycle.dispose();
  });

  it("shuts down when re-parented (Linux/macOS: ppid becomes init or a subreaper)", async () => {
    vi.useFakeTimers();
    let ppid = 4242;
    const { exit, lifecycle } = setup({ currentParentPid: () => ppid });
    await vi.advanceTimersByTimeAsync(1000);
    expect(exit).not.toHaveBeenCalled();
    ppid = 1;
    await vi.advanceTimersByTimeAsync(1000);
    expect(exit).toHaveBeenCalledWith(0);
    lifecycle.dispose();
  });

  it("skips the parent watch when started with no meaningful parent (ppid <= 1)", async () => {
    vi.useFakeTimers();
    const isAlive = vi.fn(() => false);
    const { exit, lifecycle } = setup({ parentPid: 1, currentParentPid: () => 1, isAlive });
    await vi.advanceTimersByTimeAsync(5000);
    expect(isAlive).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    lifecycle.dispose();
  });

  it("still exits if shutdown hangs, after forceExitMs", async () => {
    vi.useFakeTimers();
    const { stdin, exit, lifecycle } = setup({ shutdown: () => new Promise<void>(() => {}) });
    stdin.emit("end");
    await vi.advanceTimersByTimeAsync(2999);
    expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledWith(0);
    lifecycle.dispose();
  });

  it("still exits if shutdown throws", async () => {
    const { stdin, exit, lifecycle } = setup({
      shutdown: async () => {
        throw new Error("boom");
      },
    });
    stdin.emit("end");
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    lifecycle.dispose();
  });

  it("dispose removes every listener and stops polling", async () => {
    vi.useFakeTimers();
    const isAlive = vi.fn(() => true);
    const { stdin, stdout, signals, lifecycle } = setup({ isAlive });
    lifecycle.dispose();
    expect(stdin.listenerCount("end") + stdin.listenerCount("close")).toBe(0);
    expect(stdout.listenerCount("error")).toBe(0);
    expect(signals.eventNames()).toEqual([]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(isAlive).not.toHaveBeenCalled();
  });
});

describe("isProcessAlive", () => {
  it("is true for this process", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it("is false for a pid that cannot exist", () => {
    expect(isProcessAlive(2 ** 22 + 12345)).toBe(false);
  });
});
