// examples/list-tabs.ts: the smallest script that lives outside the repo. It lists the tabs this
// client may see (handle, who holds it, title). It changes no tab and no setting (connect() may start
// the daemon, as any client does).
//
// In the script's own folder, in PowerShell (setup: docs/setup.md, "Scripts from any folder"):
//   npm init -y
//   npm pkg set type=module
//   npm install <repo>\sdk tsx
//   npx tsx list-tabs.ts
//
// The SDK finds the token itself, from the checkout it was installed from (BRIDGE_TOKEN wins when set).
// This script never reads or prints it.
import { BridgeError, connect } from "@bridge/sdk";

const client = await connect({ name: "list-tabs-example" });
try {
  const tabs = await client.tabs();
  for (const t of tabs) {
    // A disarmed bridge or a blocked site comes back with an empty title and `hidden` set.
    const title = t.hidden ? `(hidden: ${t.hidden})` : t.title;
    const holder = t.owner ? ` held by ${t.owner}` : "";
    const mine = t.current ? " <- your active tab" : "";
    console.log(`${t.handle}${holder}${mine}  ${title}`);
  }
  console.log(`${tabs.length} tab(s)`);
} catch (err) {
  if (err instanceof BridgeError) console.error(`${err.code}: ${err.message}`);
  else console.error(err);
  process.exitCode = 1;
} finally {
  client.close();
}
