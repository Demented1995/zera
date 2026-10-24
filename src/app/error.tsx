"use client";

import Link from "next/link";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center gap-4 px-5 py-16">
      <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">ZERA</p>
      <h1 className="text-3xl font-semibold tracking-tight">Pagina nu a putut fi afișată</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Reîncercați. Dacă problema persistă, reveniți la pagina principală.
      </p>
      <div className="flex gap-4 text-sm">
        <button type="button" className="underline-offset-4 hover:underline" onClick={() => reset()}>
          Reîncearcă
        </button>
        <Link href="/" className="underline-offset-4 hover:underline">
          Acasă
        </Link>
      </div>
    </main>
  );
}
