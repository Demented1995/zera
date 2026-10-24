import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function ErrorState({
  title = "A apărut o eroare",
  description = "Nu am putut încărca conținutul. Încercați din nou.",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" aria-hidden />
      </div>
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
