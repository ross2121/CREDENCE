# GoldRush Submission Copy

AXIOM uses GoldRush as the data layer for private credit scoring.

The credit agent consumes cross-chain wallet history, USDT transfer behavior, portfolio history, DeFi interactions, and prior repayment signals. QVAC computes the credit tier locally, then AXIOM registers only a ZK proof and tier result on-chain.

GoldRush gives the model enough structured signal to score borrowers without KYC and without forcing users to reveal raw financial history to the lending pool.

The demo uses fixture-backed GoldRush data for no-key reliability while preserving the same feature engineering path used for live API data.
