// The MCP's tab cursor (Step 7 T4): the tab an untargeted tool acts on. Spec §8.3 as far as Step 7
// goes — on the first tab-touching tool with no `tab`, claim the human's active tab
// (`tabs.claim {active:true}`) and keep it; the human switching tabs does not move it. Three tools
// move it (`set`): browser_select_tab, browser_new_tab and, since Step 8 S5, browser_use_active_tab —
// the one way it follows the human (phase doc 0.6). browser_status shows it and never claims.
//
// A daemon restart renumbers handles, so the cursor is lost (phase-doc 0.2, amended and corrected;
// decisions.md · 2026-10-21 #11): on a 4002 reconnect (`on("reconnected")`) and when BridgeLink adopts
// a new client after an earlier one (any other close, decision #15). The next untargeted call claims
// like first touch, and its result gets one line saying so. A cursor whose tab closed is NOT cleared:
// the daemon's TAB_GONE reaches the agent, which picks a tab — nothing silently acts on the human's tab.
import { BridgeError, ErrorCodes } from "@bridge/sdk";
import type { WelcomeMessage } from "@bridge/shared";

/** The one line prefixed to the first result after a lost cursor was re-claimed. */
export function lostNotice(tab: string): string {
  return `Note: the bridge daemon restarted, so this session's tab was lost; it now holds ${tab} (the active tab).`;
}

/** What the cursor calls: `tabs.claim`. */
export interface CursorBridge {
  call(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

/** What the cursor needs of a client BridgeLink adopted. */
export interface CursorClient {
  on(type: "reconnected", listener: (welcome: WelcomeMessage) => void): () => void;
}

export interface ResolvedTab {
  tab: string;
  /** `lostNotice(tab)` for exactly one caller after a lost cursor was re-claimed, else null. */
  notice: string | null;
}

export class TabCursor {
  private handle: string | null = null;
  /** A cursor existed and was lost; cleared by the re-claim that gives the notice, or by `set`. */
  private lostFlag = false;
  private pendingNotice: string | null = null;
  /** Bumped on every loss and every `set`, so a claim that started before cannot land after. */
  private generation = 0;
  private inflight: Promise<string> | null = null;
  private adopted = 0;
  private detach: (() => void) | null = null;

  constructor(private readonly bridge: CursorBridge) {}

  /** The cursor's handle, or null before the first touch and after a loss. */
  get tab(): string | null {
    return this.handle;
  }

  /** Moves the cursor (browser_select_tab, browser_new_tab, browser_use_active_tab). A pending loss no longer matters. */
  set(tab: string): void {
    this.handle = tab;
    this.lostFlag = false;
    this.pendingNotice = null;
    this.generation++;
    this.inflight = null;
  }

  /** The daemon restarted: the handle may name another tab now. */
  markLost(): void {
    if (this.handle !== null) {
      this.handle = null;
      this.lostFlag = true;
    }
    this.generation++;
    this.inflight = null;
  }

  /**
   * BridgeLink's hook, called with each client it adopts: the second and later adoptions are a loss
   * (the earlier client failed — decision #15), and a 4002 reconnect of the current one is too.
   */
  adopt(client: CursorClient): void {
    this.detach?.();
    if (this.adopted++ > 0) this.markLost();
    this.detach = client.on("reconnected", () => this.markLost());
  }

  /** The tab an untargeted call acts on: the cursor, or a first-touch claim shared by concurrent callers. */
  async resolve(): Promise<ResolvedTab> {
    if (this.handle !== null) return { tab: this.handle, notice: this.takeNotice() };
    if (!this.inflight) {
      const claim = this.claim(this.generation);
      this.inflight = claim;
      const clear = () => {
        if (this.inflight === claim) this.inflight = null;
      };
      claim.then(clear, clear);
    }
    const tab = await this.inflight;
    return { tab, notice: this.takeNotice() };
  }

  private takeNotice(): string | null {
    const notice = this.pendingNotice;
    this.pendingNotice = null;
    return notice;
  }

  /** Re-arms a notice whose tool call failed, so the next result still carries it. */
  restoreNotice(notice: string): void {
    if (this.pendingNotice === null) this.pendingNotice = notice;
  }

  private async claim(generation: number): Promise<string> {
    const result = await this.bridge.call("tabs.claim", { active: true });
    const tab = (result as { tab?: unknown } | null)?.tab;
    if (typeof tab !== "string") {
      throw new BridgeError(ErrorCodes.INTERNAL, "tabs.claim answered without a tab handle");
    }
    if (generation === this.generation) {
      this.handle = tab;
      if (this.lostFlag) {
        this.lostFlag = false;
        this.pendingNotice = lostNotice(tab);
      }
    }
    return tab;
  }
}
