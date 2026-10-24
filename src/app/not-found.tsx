import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col justify-center gap-4 px-5 py-16">
      <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">ZERA</p>
      <h1 className="text-3xl font-semibold tracking-tight">Pagina nu există</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Adresa nu corespunde unei pagini din magazin sau din administrare.
      </p>
      <Link href="/" className="text-sm underline-offset-4 hover:underline">
        Înapoi la pagina principală
      </Link>
    </main>
  );
}
