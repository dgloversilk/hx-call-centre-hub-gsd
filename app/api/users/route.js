import { NextResponse }    from "next/server";
import { requireRole }     from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/users — list all users (managers only)
export async function GET() {
  const { error } = await requireRole("manager");
  if (error) return error;

  const supabase = createAdminClient();
  const { data, error: dbErr } = await supabase
    .from("users")
    .select("id, email, name, avatar_url, role, last_sign_in_at, created_at")
    .order("name");

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/users — update a user's role (managers only)
export async function PATCH(request) {
  const { error, user } = await requireRole("manager");
  if (error) return error;

  const { id, role } = await request.json();

  if (!["manager", "agent"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent managers from changing their own role
  if (!id || !role) {
    return NextResponse.json({ error: "Missing id or role" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the target user to prevent self-modification
  const { data: target } = await supabase
    .from("users").select("email").eq("id", id).single();

  if (target?.email === user.email) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 403 });
  }

  const { error: dbErr } = await supabase
    .from("users").update({ role }).eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
