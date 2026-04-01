import { NextResponse } from "next/server";
import { auth }         from "./config";
import { hasMinRole }   from "./roles";

export async function requireRole(minimumRole) {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null, role: null };
  }

  const role = session.user.role ?? "agent";

  if (!hasMinRole(role, minimumRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: session.user, role };
  }

  return { error: null, user: session.user, role };
}
