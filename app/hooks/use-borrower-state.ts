"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { fetchBorrowerState, LiveBorrowerState } from "@/lib/borrower-state";

export function useBorrowerState(wallet: PublicKey | null) {
  const [data, setData] = useState<LiveBorrowerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!wallet) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setData(await fetchBorrowerState(wallet));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to load borrower state"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [wallet?.toBase58()]);

  return { data, error, loading, refresh };
}
