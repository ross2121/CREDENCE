import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DemoRequestState } from "@/lib/demo-api";

const config = {
  loading: {
    icon: LoaderCircle,
    label: "Loading",
    className: "text-muted-foreground",
  },
  empty: {
    icon: CircleDashed,
    label: "Empty",
    className: "text-muted-foreground",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    className: "text-destructive",
  },
  success: {
    icon: CheckCircle2,
    label: "Success",
    className: "text-primary",
  },
};

export function StatusState({
  state,
  title,
  message,
}: {
  state: DemoRequestState;
  title: string;
  message: string;
}) {
  const item = config[state];
  const Icon = item.icon;

  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <Icon
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0",
            item.className,
            state === "loading" && "animate-spin"
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {title}: {item.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
