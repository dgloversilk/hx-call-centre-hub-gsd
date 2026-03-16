"use client";

// Simplified provider wrapper — no next-auth session needed for demo mode.
export default function Providers({ children }) {
  return <>{children}</>;
}
