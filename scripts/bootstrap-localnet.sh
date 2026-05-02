#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "AXIOM localnet bootstrap"
echo "1. Building Anchor program"
anchor build

echo "2. Printing localnet seed plan"
npm run seed:localnet

echo "3. Localnet bootstrap complete"
echo "Run 'anchor test --skip-build' after starting a local validator."
