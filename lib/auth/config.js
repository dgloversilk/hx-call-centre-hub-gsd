import NextAuth from "next-auth";
import Google  from "next-auth/providers/google";
import { MANAGER_EMAILS } from "@/lib/auth/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],

  callbacks: {
    // Block anyone outside @holidayextras.com
    async signIn({ user }) {
      if (!user.email?.endsWith("@holidayextras.com")) return false;
      return true;
    },

    // Derive role directly from MANAGER_EMAILS — no Supabase
    async jwt({ token }) {
      if (token.email) {
        token.role = MANAGER_EMAILS.includes(token.email) ? "manager" : "agent";
      }
      return token;
    },

    // Expose role to the client session
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role ?? "agent";
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },
});
