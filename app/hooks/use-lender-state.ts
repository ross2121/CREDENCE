"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { fetchLenderState, LiveLenderState } from "@/lib/lender-state";

export function useLenderState(wallet: PublicKey | null) {
  const [data, setData] = useState<LiveLenderState | null>(null);
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
      setData(await fetchLenderState(wallet));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to load lender state"
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
