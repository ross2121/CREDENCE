# Tether / QVAC Submission Copy

AXIOM uses USDT as the protocol's exclusive settlement asset and QVAC as the local AI runtime for both borrower credit scoring and lender yield optimization.

Borrowers run a QVAC credit agent locally against their on-chain history. The agent classifies the borrower into a credit tier and generates a ZK proof, so the protocol can verify eligibility without exposing raw wallet data or KYC information.

Lenders supply USDT into the pool. A QVAC yield agent monitors utilization and routes idle capital to Kamino while preserving liquidity for borrower demand. Every agent action is policy-bound through Ika dWallet constraints.

This is the core Tether thesis applied directly: sovereign money plus sovereign AI. USDT is the unit of account, QVAC keeps inference local, and the user remains in control of their data and assets.
