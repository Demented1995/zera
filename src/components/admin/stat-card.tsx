import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value?: string | number | null;
  unavailableLabel?: string;
  icon?: LucideIcon;
  className?: string;
};

export function StatCard({
  label,
  value,
  unavailableLabel = "Date indisponibile",
  icon: Icon,
  className,
}: StatCardProps) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {hasValue ? (
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              {unavailableLabel}
            </p>
          )}
        </div>
        {Icon ? (
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
