import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth/jwt";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: SessionUser & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
