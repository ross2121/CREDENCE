"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  fetchBorrowerPolicyState,
  LiveBorrowerPolicy,
} from "@/lib/policy-state";

export function useBorrowerPolicy(
  owner: PublicKey | null,
  delegatedWallet: PublicKey | null
) {
  const [data, setData] = useState<LiveBorrowerPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!owner || !delegatedWallet) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await fetchBorrowerPolicyState(owner, delegatedWallet));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to load policy state"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [owner?.toBase58(), delegatedWallet?.toBase58()]);

  return { data, error, loading, refresh };
}
