// The daemon entry (`daemon/dist/index.js`), spawned detached with no stdio by the SDK (phase-doc
// decision 0.8). All behaviour lives in `main.ts`; this file only hands it the real process.
import { createFileLogger } from "./log.js";
import { runDaemon } from "./main.js";

void runDaemon({
  env: process.env,
  argv1: process.argv[1] ?? "",
  pid: process.pid,
  logger: createFileLogger(),
  exit: (code) => process.exit(code),
  on: (event, listener) => {
    process.on(event as NodeJS.Signals, listener);
  },
});
