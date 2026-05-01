import { requireAdmin } from "@/lib/auth";
import { mutate } from "@/lib/storage";
import { drawGroupsAndMatches } from "@/lib/draw";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const next = await mutate((t) => {
      if (t.state !== "pairs_drawn") {
        throw new Error("Primero hay que sortear las parejas");
      }
      const { teams, groups, matches } = drawGroupsAndMatches(t.teams);
      return {
        ...t,
        teams,
        groups,
        matches,
        state: "bracket_drawn",
      };
    });
    return Response.json({ ok: true, groups: next.groups, matches: next.matches });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "draw failed" },
      { status: 400 },
    );
  }
}

// Volver a sortear grupos (mantiene parejas)
export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await mutate((t) => ({
    ...t,
    teams: t.teams.map(({ groupId: _g, ...rest }) => rest),
    groups: [],
    matches: [],
    state: "pairs_drawn",
    champion: null,
  }));
  return Response.json({ ok: true });
}
