import { cookies } from "next/headers";
import { createHash } from "node:crypto";

export const ADMIN_COOKIE = "sirius_admin";

export function getAdminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD env var must be set in production");
  }
  return "padel2026";
}

export function adminToken(): string {
  return createHash("sha256").update(getAdminPassword()).digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
