"use client";

import { ReactNode, useMemo } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { ConnectionProvider } from "@solana/wallet-adapter-react";
import { ToastProvider } from "@/components/toast-provider";

const defaultRpc = "https://api.devnet.solana.com";

export function Providers({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL ?? defaultRpc;
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const solanaClusters = useMemo(
    () => [
      {
        name: "devnet" as const,
        rpcUrl: endpoint,
      },
    ],
    [endpoint]
  );
  const solanaConnectors = useMemo(
    () => toSolanaWalletConnectors({ shouldAutoConnect: false }),
    []
  );

  const walletTree = (
    <ConnectionProvider endpoint={endpoint}>
      {children}
    </ConnectionProvider>
  );

  if (!privyAppId) {
    return (
      <ToastProvider>
        <div className="p-6 text-sm text-destructive">
          Missing NEXT_PUBLIC_PRIVY_APP_ID. Credence now uses Privy as the
          only app wallet, so this env var is required.
        </div>
      </ToastProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["wallet"],
        appearance: {
          theme: "light",
          accentColor: "#0f766e",
          walletChainType: "solana-only",
          walletList: ["phantom", "backpack", "solflare"],
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
        solanaClusters,
      }}
    >
      <ToastProvider>{walletTree}</ToastProvider>
    </PrivyProvider>
  );
}
