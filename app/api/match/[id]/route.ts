import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mutate } from "@/lib/storage";
import { applyResultsToBracket } from "@/lib/draw";
import type { Score } from "@/lib/types";

interface UpdateBody {
  score?: Score | null;
  winner?: string | null;
  status?: "pending" | "in_progress" | "done";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json()) as UpdateBody;

  try {
    const next = await mutate((t) => {
      const matches = t.matches.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m };
        if (body.score !== undefined) updated.score = body.score;
        if (body.winner !== undefined) updated.winner = body.winner;
        if (body.status !== undefined) updated.status = body.status;
        return updated;
      });
      return applyResultsToBracket({ ...t, matches });
    });
    return Response.json({ ok: true, state: next.state, champion: next.champion });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "update failed" },
      { status: 400 },
    );
  }
}
