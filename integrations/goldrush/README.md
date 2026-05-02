# AXIOM GoldRush Integration

This package is the GoldRush boundary for AXIOM credit scoring. It normalizes
transaction, balance, and portfolio data into the `WalletHistory` format used by
the QVAC credit agent.

Live requests require `GOLDRUSH_API_KEY` and an injected `fetchJson` transport.
Tests use fixtures so the demo remains reliable without network access.
