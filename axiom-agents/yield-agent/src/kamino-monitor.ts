import { YieldMarketSnapshot } from "./types";

export class KaminoApyMonitor {
  constructor(private readonly fallbackApyBps = 850) {}

  async snapshot(): Promise<Pick<YieldMarketSnapshot, "kaminoApyBps">> {
    return { kaminoApyBps: this.fallbackApyBps };
  }
}
