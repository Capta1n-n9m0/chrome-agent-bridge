import { WebSocketServer, type WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { Bridge } from "./bridge.js";
import { ExtensionConnection } from "./connection.js";
import { validateHello } from "./handshake.js";

export interface WsHostOptions {
  port: number;
  token: string;
}

export class WsHost {
  private wss: WebSocketServer | undefined;

  constructor(
    private readonly bridge: Bridge,
    private readonly options: WsHostOptions,
  ) {}

  listen(): Promise<number> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ host: "127.0.0.1", port: this.options.port });
      wss.on("error", reject);
      wss.on("listening", () => {
        this.wss = wss;
        wss.off("error", reject);
        wss.on("connection", (ws) => this.onConnection(ws));
        resolve((wss.address() as AddressInfo).port);
      });
    });
  }

  private onConnection(ws: WebSocket): void {
    let authed = false;
    let connection: ExtensionConnection | undefined;

    ws.on("error", (err) => console.error("[chrome-bridge] socket error:", err));

    ws.on("message", (raw) => {
      const data = raw.toString();
      if (!authed) {
        const result = validateHello(data, this.options.token);
        if (!result.ok) {
          ws.close(4001, result.reason);
          return;
        }
        authed = true;
        connection = new ExtensionConnection((d) => ws.send(d));
        this.bridge.setConnection(connection);
        return;
      }
      connection?.handleMessage(data);
    });

    ws.on("close", () => {
      if (connection) {
        connection.rejectAll("extension disconnected");
        if (this.bridge.currentConnection() === connection) {
          this.bridge.setConnection(null);
        }
      }
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) return resolve();
      this.wss.close(() => resolve());
      for (const client of this.wss.clients) client.terminate();
    });
  }
}
