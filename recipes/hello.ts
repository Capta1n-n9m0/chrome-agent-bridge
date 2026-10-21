// recipes/hello.ts: the smallest SDK script, used by the E2E rows MUX-3, MUX-5, MUX-6 and MUX-8
// (docs/e2e-test-plan.md §4.12). It connects through @bridge/sdk (which starts the daemon if none
// runs, or hands an older build over), calls `listTabs`, prints what it saw and closes.
//
//   npx tsx recipes/hello.ts            # connect, list tabs, close
//   npx tsx recipes/hello.ts 20000      # ... and stay connected 20 s first (or set HOLD_MS), then
//                                       #     check with daemon.status that the connection survived
//
// Environment (all optional):
//   RECIPE_NAME   the client name the daemon lists in `daemon.status` / `browser_status`
//                 (default "hello-recipe")
//   HOLD_MS       how long to stay connected after listTabs, so `browser_status` can see the client
//   BRIDGE_PORT, BRIDGE_TOKEN, BRIDGE_DAEMON_IDLE_MS are read by the SDK / the spawned daemon, not here.
//
// The token is resolved by the SDK only (BRIDGE_TOKEN, else bridge.token at the workspace root); this
// script never reads or prints it. It prints tab ids and titles, never URLs.
import { BridgeError, connect } from "@bridge/sdk";

interface Tab {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

interface DaemonStatus {
  build: string;
  uptime: number;
  extensionConnected: boolean;
  clients: Array<{ id: string; name: string; since: number }>;
  port: number;
}

const name = process.env.RECIPE_NAME?.trim() || "hello-recipe";
const holdRaw = process.argv[2] ?? process.env.HOLD_MS ?? "0";
const holdMs = Number(holdRaw);
const started = Date.now();
const elapsed = (): number => Date.now() - started;
const stamp = (): string => new Date().toISOString();

function fail(err: unknown): void {
  if (err instanceof BridgeError) {
    console.error(`${stamp()} ${name}: FAILED after ${elapsed()} ms — ${err.code}: ${err.message}`);
  } else {
    console.error(`${stamp()} ${name}: FAILED after ${elapsed()} ms — ${err instanceof Error ? err.message : String(err)}`);
  }
  process.exitCode = 1;
}

async function main(): Promise<void> {
  if (!Number.isFinite(holdMs) || holdMs < 0) {
    throw new Error(`HOLD_MS / argv[2] must be a number of ms >= 0, got: "${holdRaw}"`);
  }
  console.log(`${stamp()} ${name}: connecting (pid ${process.pid})`);
  const client = await connect({ name });
  try {
    const welcome = client.welcome;
    console.log(
      `${stamp()} ${name}: connected in ${elapsed()} ms as client ${welcome?.clientId ?? "?"} — ` +
        `daemon build ${welcome?.build ?? "?"}, proto ${welcome?.proto ?? "?"}`,
    );
    client.on("reconnected", (w) => {
      console.log(`${stamp()} ${name}: daemon restarted (4002) — reconnected as client ${w.clientId} to build ${w.build}`);
    });

    const status = (await client.status()) as DaemonStatus;
    console.log(
      `${stamp()} ${name}: daemon.status — port ${status.port}, up ${Math.round(status.uptime / 1000)}s, ` +
        `extension ${status.extensionConnected ? "connected" : "not connected"}, ` +
        `clients (${status.clients.length}): ${status.clients.map((c) => c.name).join(", ")}`,
    );

    const { tabs } = (await client.call("listTabs")) as { tabs: Tab[] };
    const active = tabs.find((t) => t.active);
    console.log(
      `${stamp()} ${name}: listTabs — ${tabs.length} tab(s); active: ` +
        (active ? `[${active.id}] ${active.title}` : "none"),
    );

    if (holdMs > 0) {
      console.log(`${stamp()} ${name}: holding the connection for ${holdMs} ms — call browser_status now`);
      await new Promise((resolve) => setTimeout(resolve, holdMs));
      // Prove the connection survived the hold. The client reconnects on 4002 only; after any other
      // close it is "failed" and this call throws that failure (NOT_CONNECTED, naming the close code),
      // so a connection that dropped during the hold ends in FAILED / exit 1, never in OK.
      const after = (await client.status()) as DaemonStatus;
      const myId = client.welcome?.clientId;
      if (!after.clients.some((c) => c.id === myId)) {
        throw new Error(`the daemon no longer lists this client (${myId ?? "?"}) after the hold`);
      }
      console.log(`${stamp()} ${name}: still connected after the hold — clients (${after.clients.length})`);
    }
  } finally {
    client.close();
  }
  console.log(`${stamp()} ${name}: closed after ${elapsed()} ms — OK`);
}

await main().catch(fail);
