export const metadata = {
  title: "Admin | ZERA",
};

export default function AdminPage() {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Panou administrare</h1>
      <p className="max-w-2xl text-muted-foreground">
        Stage 1 este activ: autentificare securizată, roluri ADMIN / MANAGER și
        rute protejate. Modulele pentru materiale, prețuri, configurator și
        magazin vor fi adăugate în etapele următoare.
      </p>
    </section>
  );
}
