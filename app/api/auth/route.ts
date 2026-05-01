import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  if (password !== ADMIN_PASSWORD) {
    return Response.json({ error: "invalid_password" }, { status: 401 });
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, ADMIN_PASSWORD, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
