import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline">
        Deconectare
      </Button>
    </form>
  );
}
