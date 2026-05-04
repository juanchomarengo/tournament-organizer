import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken, getAdminPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  if (password !== getAdminPassword()) {
    return Response.json({ error: "invalid_password" }, { status: 401 });
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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
