import { requireAdmin } from "@/lib/auth";
import { mutate } from "@/lib/storage";
import { drawPairs } from "@/lib/draw";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const next = await mutate((t) => {
      if (t.state !== "setup") {
        throw new Error("El sorteo de parejas ya se ejecutó");
      }
      const teams = drawPairs(t.players);
      return {
        ...t,
        teams,
        state: "pairs_drawn",
        groups: [],
        matches: [],
        champion: null,
      };
    });
    return Response.json({ ok: true, teams: next.teams });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "draw failed" },
      { status: 400 },
    );
  }
}

// Re-sortear (resetea torneo a setup primero)
export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await mutate((t) => ({
    ...t,
    teams: [],
    groups: [],
    matches: [],
    state: "setup",
    champion: null,
  }));
  return Response.json({ ok: true });
}
