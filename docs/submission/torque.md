# Torque Submission Copy

AXIOM uses Torque MCP as the protocol's autonomous growth surface.

The yield agent watches utilization and repayment metrics. When utilization is low, it creates lender incentive campaigns. When utilization is high, it creates borrower referral campaigns. When borrowers repay on time, it triggers good-repayer rewards.

The E2E demo creates a deterministic Torque lender campaign from a low-utilization trigger and returns the campaign id `torque-lender-boost`.

Torque is not a side quest in AXIOM. It is how the protocol responds to liquidity imbalance without a human operator manually launching incentives.
