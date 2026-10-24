import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

import "@/lib/auth/types";

/**
 * Edge-safe Auth.js config (no Prisma / Node-only imports).
 * Used by middleware. Full providers live in config.ts.
 */
export const edgeAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      const isStaff = role === "ADMIN" || role === "MANAGER";

      if (pathname.startsWith("/admin")) {
        return Boolean(auth?.user && isStaff);
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role as Role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
