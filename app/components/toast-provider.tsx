"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Toast = {
  id: number;
  title: string;
  message: string;
  href?: string;
  variant?: "success" | "error";
};

type ToastContextValue = {
  showToast: (toast: Omit<Toast, "id">) => void;
  showErrorToast: (message: string, title?: string) => void;
  showTransactionToast: (signature: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: (toast) => {
        const id = Date.now();
        setToasts((current) => [...current, { ...toast, id }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 9000);
      },
      showErrorToast: (message, title = "Transaction failed") => {
        const id = Date.now();
        setToasts((current) => [
          ...current,
          { id, title, message, variant: "error" },
        ]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 12000);
      },
      showTransactionToast: (signature, title = "Transaction confirmed") => {
        const shortSignature = `${signature.slice(0, 8)}...${signature.slice(-8)}`;
        const href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
        const id = Date.now();
        setToasts((current) => [
          ...current,
          {
            id,
            title,
            message: shortSignature,
            href,
            variant: "success",
          },
        ]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== id));
        }, 12000);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-md border border-border bg-card p-4 text-card-foreground shadow-lg"
          >
            <div className="flex items-start gap-3">
              {toast.variant === "error" ? (
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{toast.title}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {toast.message}
                </p>
                {toast.href ? (
                  <a
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    href={toast.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View on Solana Explorer
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
              <Button
                aria-label="Dismiss notification"
                className="h-8 w-8 flex-none p-0"
                onClick={() =>
                  setToasts((current) =>
                    current.filter((item) => item.id !== toast.id)
                  )
                }
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
