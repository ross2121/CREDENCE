# Eitherway Submission Copy

AXIOM integrates Kamino, QuickNode, and Birdeye as load-bearing protocol components.

Kamino is the idle capital layer. When lending utilization is low, the yield agent routes unused USDT into Kamino. When utilization rises, the agent withdraws liquidity back into the AXIOM pool.

QuickNode powers transaction execution and real-time event monitoring for loan, repayment, liquidation, and rebalance flows.

Birdeye powers collateral pricing and liquidation warning logic. The demo computes liquidation risk from collateral value and debt, then surfaces the warning path in the deterministic E2E script and analytics UI.

Together these integrations turn AXIOM from a static lending pool into an actively monitored, yield-aware, liquidation-safe credit protocol.
