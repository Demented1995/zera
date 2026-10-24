import { ModulePlaceholder } from "@/components/admin/module-placeholder";
import { requirePageAccess } from "@/lib/auth/guards";

export const metadata = {
  title: "Setări | ZERA",
};

export default async function SetariPage() {
  await requirePageAccess("admin");

  return (
    <ModulePlaceholder
      title="Setări"
      description="Setările sensibile ale aplicației sunt disponibile doar pentru rolul ADMIN. Modulul este în pregătire."
    />
  );
}
