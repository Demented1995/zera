import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/config";
import "@/lib/auth/types";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
