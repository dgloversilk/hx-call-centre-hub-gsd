"use client";

// SessionProvider must be a client component in Next.js App Router.
// Wrap the whole app with this in layout.js.

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
