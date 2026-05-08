"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchLivePoolState, LivePoolState } from "@/lib/devnet-pool";

type LivePoolHook = {
  data: LivePoolState | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useLivePool(): LivePoolHook {
  const [data, setData] = useState<LivePoolState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchLivePoolState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown RPC error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, loading, refresh };
}
