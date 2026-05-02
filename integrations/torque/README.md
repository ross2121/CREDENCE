# Torque MCP Integration

AXIOM uses Torque MCP as the yield agent's growth-campaign surface. The integration builds deterministic campaign prompts for:

- Low-utilization lender incentives.
- High-utilization borrower referral rewards.
- Good-repayer airdrops.

The client supports fixture mode for no-key local demos and a `runPrompt` adapter for live MCP execution. Live requests require `TORQUE_API_KEY`.
