# AXIOM Kamino Integration

This package adapts AXIOM yield routing to Kamino. It resolves the configured
USDT reserve/vault route, builds AXIOM rebalance helpers for deposits and
withdrawals, and returns a live or fallback APY snapshot.

The fallback APY keeps local demos deterministic when Kamino network calls are
not available.
