# Ika Submission Copy

AXIOM uses Ika dWallets as the safety layer for AI-managed lending.

The borrower agent can initiate repayment actions, but Ika policy only permits transfers to the AXIOM repayment stream vault and only up to the configured loan amount. The lender yield agent can rebalance idle USDT, but only between the AXIOM pool and the configured Kamino vault.

The demo includes an unauthorized destination attempt that fails before execution. This shows the core value of Ika for agentic finance: the AI can act, but it cannot exceed the user's cryptographic policy.

AXIOM also models cross-chain collateral policy for bridgeless capital markets, where native collateral can be governed by dWallet rules without wrapping or bridging into the lending protocol.
