#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

: "${SOLANA_RPC_URL:?SOLANA_RPC_URL is required}"
: "${ANCHOR_PROVIDER_WALLET:?ANCHOR_PROVIDER_WALLET is required}"

echo "Deploying AXIOM program to devnet"
anchor build -- --no-default-features --features production
anchor deploy --provider.cluster "$SOLANA_RPC_URL" --provider.wallet "$ANCHOR_PROVIDER_WALLET"

echo "Devnet deploy complete"
