# Ika Submission Copy

AXIOM models the Ika dWallet safety layer for AI-managed lending, and keeps the on-chain policy surface ready for a future public Solana CPI integration.

On the current Solana devnet deployment, the live wallet policy layer is Privy plus AXIOM on-chain policy. The borrower agent can initiate repayment actions, but policy only permits transfers to the AXIOM repayment stream vault and only up to the configured loan amount. The lender yield agent can rebalance idle USDT, but only between the AXIOM pool and configured yield destinations.

The demo includes an unauthorized destination attempt that fails before execution. This preserves the core value for agentic finance: the AI can act, but it cannot exceed the user's policy.

AXIOM also models cross-chain collateral policy for bridgeless capital markets, where native collateral can be governed by dWallet rules without wrapping or bridging into the lending protocol.
