import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
  rows?: number;
};

export function LoadingState({
  label = "Se încarcă…",
  className,
  rows = 3,
}: LoadingStateProps) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
