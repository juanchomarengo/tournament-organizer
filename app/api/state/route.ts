import { NextRequest } from "next/server";
import { readTournament, writeTournament } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth";
import type { Tournament } from "@/lib/types";

export async function GET() {
  const t = await readTournament();
  return Response.json(t, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await req.json()) as Tournament;
  await writeTournament(body);
  return Response.json({ ok: true });
}
