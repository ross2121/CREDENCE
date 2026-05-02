# AXIOM QVAC Yield Agent

The yield agent watches AXIOM pool liquidity, compares idle USDT against a
Kamino APY signal, and builds policy-checked rebalance calls through the SDK.

The default strategy keeps a 20% liquid buffer, deposits idle liquidity when
utilization is low and Kamino APY is meaningfully higher, and withdraws from
Kamino when utilization is high.

```ts
import { YieldAgent } from "./src";

const agent = new YieldAgent();
const decision = agent.decide(poolSnapshot, marketSnapshot);
const txs = agent.buildRebalanceTransactions(client, decision, ikaPolicy);
```
