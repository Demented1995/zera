import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { requirePageAccess } from "@/lib/auth/guards";

export const metadata = {
  title: "Utilizatori",
};

export default async function UtilizatoriPage() {
  await requirePageAccess("admin");

  return (
    <ModulePlaceholder
      title="Utilizatori"
      description="Gestionarea conturilor și rolurilor este rezervată administratorilor. Modulul va fi dezvoltat ulterior."
    />
  );
}
