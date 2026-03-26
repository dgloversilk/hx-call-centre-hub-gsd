import { NextResponse } from "next/server";

export async function POST(request) {
  const { code } = await request.json();
  const expected = process.env.ACCESS_CODE;

  if (!expected) {
    // No access code set — block access until one is configured
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (code === expected) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
