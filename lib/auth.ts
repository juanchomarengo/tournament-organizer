import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sirius_admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "padel2026";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === ADMIN_PASSWORD;
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
