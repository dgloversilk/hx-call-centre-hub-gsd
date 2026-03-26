import { NextResponse } from "next/server";

export async function POST(request) {
  const { code } = await request.json();
  const expected = process.env.ACCESS_CODE;

  if (!expected) {
    // No access code set — allow through (dev mode)
    return NextResponse.json({ ok: true });
  }

  if (code === expected) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
