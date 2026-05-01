import type { Player, Team, Tournament, Group, GroupId, Match } from "./types";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function drawPairs(players: Player[]): Team[] {
  const intermedios = shuffle(players.filter((p) => p.level === "intermedio"));
  const principiantes = shuffle(players.filter((p) => p.level === "principiante"));
  if (intermedios.length !== principiantes.length) {
    throw new Error("Cantidad de intermedios y principiantes no coincide");
  }
  return intermedios.map((a, i) => ({
    id: newId("t"),
    playerIds: [a.id, principiantes[i].id] as [string, string],
  }));
}

const GROUP_IDS: GroupId[] = ["A", "B", "C", "D"];

export function drawGroupsAndMatches(teams: Team[]): {
  teams: Team[];
  groups: Group[];
  matches: Match[];
} {
  if (teams.length !== 12) {
    throw new Error(
      `Se esperaban 12 parejas para armar 4 grupos de 3, hay ${teams.length}`,
    );
  }
  const shuffled = shuffle(teams);
  const groups: Group[] = GROUP_IDS.map((id, idx) => ({
    id,
    teamIds: shuffled.slice(idx * 3, idx * 3 + 3).map((t) => t.id),
  }));

  const teamsWithGroup = teams.map((t) => {
    const g = groups.find((gr) => gr.teamIds.includes(t.id));
    return { ...t, groupId: g?.id };
  });

  // 4 canchas, una por grupo en fase de grupos. 3 partidos por grupo (round-robin).
  // Round 1: A1 vs A2, B1 vs B2, C1 vs C2, D1 vs D2 — descansa el 3°
  // Round 2: A1 vs A3, B1 vs B3, C1 vs C3, D1 vs D3 — descansa el 2°
  // Round 3: A2 vs A3, B2 vs B3, C2 vs C3, D2 vs D3 — descansa el 1°
  const pairings: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  const matches: Match[] = [];
  pairings.forEach(([i, j], roundIdx) => {
    groups.forEach((g, gIdx) => {
      matches.push({
        id: newId("m"),
        phase: "groups",
        round: roundIdx + 1,
        court: gIdx + 1,
        teamA: g.teamIds[i],
        teamB: g.teamIds[j],
        score: null,
        winner: null,
        status: "pending",
        groupId: g.id,
        label: `Grupo ${g.id}`,
      });
    });
  });

  // Final Four (canchas 1 y 2): semis ronda 4, final + 3er puesto ronda 5
  matches.push({
    id: newId("m"),
    phase: "semis",
    round: 4,
    court: 1,
    teamA: null,
    teamB: null,
    score: null,
    winner: null,
    status: "pending",
    label: "Semifinal 1 (1°A vs 1°D)",
  });
  matches.push({
    id: newId("m"),
    phase: "semis",
    round: 4,
    court: 2,
    teamA: null,
    teamB: null,
    score: null,
    winner: null,
    status: "pending",
    label: "Semifinal 2 (1°B vs 1°C)",
  });
  matches.push({
    id: newId("m"),
    phase: "final",
    round: 5,
    court: 1,
    teamA: null,
    teamB: null,
    score: null,
    winner: null,
    status: "pending",
    label: "FINAL",
  });
  matches.push({
    id: newId("m"),
    phase: "third",
    round: 5,
    court: 2,
    teamA: null,
    teamB: null,
    score: null,
    winner: null,
    status: "pending",
    label: "3er puesto",
  });

  return { teams: teamsWithGroup, groups, matches };
}

export function teamLabel(team: Team | undefined, players: Player[]): string {
  if (!team) return "—";
  const a = players.find((p) => p.id === team.playerIds[0])?.name ?? "?";
  const b = players.find((p) => p.id === team.playerIds[1])?.name ?? "?";
  return `${a} & ${b}`;
}

export function rankGroup(
  group: Group,
  matches: Match[],
): Array<{ teamId: string; wins: number; gamesFor: number; gamesAgainst: number; gameDiff: number }> {
  const groupMatches = matches.filter(
    (m) => m.phase === "groups" && m.groupId === group.id,
  );
  const stats = group.teamIds.map((teamId) => {
    let wins = 0;
    let gamesFor = 0;
    let gamesAgainst = 0;
    for (const m of groupMatches) {
      if (m.teamA !== teamId && m.teamB !== teamId) continue;
      if (m.status !== "done" || !m.score) continue;
      const isA = m.teamA === teamId;
      const myGames = isA ? m.score.gamesA : m.score.gamesB;
      const oppGames = isA ? m.score.gamesB : m.score.gamesA;
      gamesFor += myGames;
      gamesAgainst += oppGames;
      if (m.winner === teamId) wins += 1;
    }
    return { teamId, wins, gamesFor, gamesAgainst, gameDiff: gamesFor - gamesAgainst };
  });
  stats.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    return b.gamesFor - a.gamesFor;
  });
  return stats;
}

export function applyResultsToBracket(t: Tournament): Tournament {
  // Cuando los 12 partidos de grupos están todos cerrados, asignar los 1° de grupo a las semis.
  const groupMatches = t.matches.filter((m) => m.phase === "groups");
  const allGroupsDone =
    groupMatches.length === 12 && groupMatches.every((m) => m.status === "done");

  if (!allGroupsDone) return t;

  const winners: Record<GroupId, string | null> = { A: null, B: null, C: null, D: null };
  for (const g of t.groups) {
    const ranking = rankGroup(g, t.matches);
    winners[g.id] = ranking[0]?.teamId ?? null;
  }

  const matches = t.matches.map((m) => {
    if (m.phase !== "semis") return m;
    if (m.label?.includes("1°A vs 1°D")) {
      return { ...m, teamA: winners.A, teamB: winners.D };
    }
    if (m.label?.includes("1°B vs 1°C")) {
      return { ...m, teamA: winners.B, teamB: winners.C };
    }
    return m;
  });

  // Asignar ganadores de semis a la final, perdedores al 3er puesto
  const semiMatches = matches.filter((m) => m.phase === "semis");
  const allSemisDone = semiMatches.length === 2 && semiMatches.every((m) => m.status === "done");

  let finalUpdated = matches;
  if (allSemisDone) {
    const [s1, s2] = semiMatches;
    const finalA = s1.winner;
    const finalB = s2.winner;
    const thirdA = s1.teamA === s1.winner ? s1.teamB : s1.teamA;
    const thirdB = s2.teamA === s2.winner ? s2.teamB : s2.teamA;
    finalUpdated = matches.map((m) => {
      if (m.phase === "final") return { ...m, teamA: finalA, teamB: finalB };
      if (m.phase === "third") return { ...m, teamA: thirdA, teamB: thirdB };
      return m;
    });
  }

  // Detectar campeón
  const finalMatch = finalUpdated.find((m) => m.phase === "final");
  const champion = finalMatch?.status === "done" ? finalMatch.winner : null;

  let state = t.state;
  if (champion) state = "finished";
  else if (allGroupsDone) state = "running";

  return { ...t, matches: finalUpdated, champion, state };
}
