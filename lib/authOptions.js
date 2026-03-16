import GoogleProvider from "next-auth/providers/google";

// Manager emails — these users see the full dashboard
const MANAGER_EMAILS = [
  "daniel.glover-silk@holidayextras.com",
];

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Request BigQuery read access alongside standard profile scopes
          scope:       "openid email profile https://www.googleapis.com/auth/bigquery.readonly",
          access_type: "online",
          prompt:      "select_account",
        },
      },
    }),
  ],

  callbacks: {
    // Block sign-in for anyone outside holidayextras.com
    async signIn({ profile }) {
      return profile?.email?.endsWith("@holidayextras.com") ?? false;
    },

    // Persist the Google access token so API routes can call BigQuery
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },

    // Expose the access token and role to the client session
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.role   = MANAGER_EMAILS.includes(session.user.email) ? "manager" : "agent";
      return session;
    },
  },

  pages: {
    signIn: "/",   // Use our custom login screen
    error:  "/",   // Redirect errors back to the home page
  },
};
