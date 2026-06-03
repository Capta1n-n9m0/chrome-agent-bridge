import { ExtensionConnection } from "./connection.js";

const NOT_CONNECTED =
  "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?";

export class Bridge {
  private connection: ExtensionConnection | null = null;

  setConnection(connection: ExtensionConnection | null): void {
    this.connection = connection;
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  currentConnection(): ExtensionConnection | null {
    return this.connection;
  }

  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.connection) throw new Error(NOT_CONNECTED);
    return this.connection.call(method, params);
  }
}
