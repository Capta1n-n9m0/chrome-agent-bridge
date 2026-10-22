// The slice of jsdom's API the T4.2 fixtures use. The repo has jsdom (vitest's DOM environment) but
// not @types/jsdom, and `sdk/tsconfig.json` typechecks `test/`; this keeps the shim lane-local
// instead of adding a dependency.
declare module "jsdom" {
  export interface ConstructorOptions {
    url?: string;
  }
  export class JSDOM {
    constructor(html?: string, options?: ConstructorOptions);
    readonly window: Window & typeof globalThis;
  }
}
