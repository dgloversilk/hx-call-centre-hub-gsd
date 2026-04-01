import NextAuth from "next-auth";
import Google  from "next-auth/providers/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { MANAGER_EMAILS }    from "@/lib/auth/roles";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],

  callbacks: {
    // Block anyone outside @holidayextras.com
    async signIn({ user }) {
      if (!user.email?.endsWith("@holidayextras.com")) return false;

      const supabase = createAdminClient();
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      const role = MANAGER_EMAILS.includes(user.email) ? "manager" : "agent";

      if (!existing) {
        await supabase.from("users").insert({
          email:            user.email,
          name:             user.name,
          avatar_url:       user.image,
          role,
          last_sign_in_at:  new Date().toISOString(),
        });
      } else {
        await supabase.from("users").update({
          name:            user.name,
          avatar_url:      user.image,
          last_sign_in_at: new Date().toISOString(),
        }).eq("email", user.email);
      }

      return true;
    },

    // Pull role from Supabase into the JWT
    async jwt({ token }) {
      if (token.email) {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("users")
          .select("id, role")
          .eq("email", token.email)
          .single();
        if (data) {
          token.dbId = data.id;
          token.role = data.role;
        }
      }
      return token;
    },

    // Expose id and role to the client session
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.dbId;
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
