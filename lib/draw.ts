import type {
  Player,
  Team,
  Tournament,
  TournamentConfig,
  Group,
  GroupId,
  Match,
  PreferredGroupCount,
} from "./types";

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

/**
 * Empareja de a 1 Intermedio + 1 Principiante mientras se pueda.
 * Si los niveles están desbalanceados, los sobrantes se emparejan entre sí (Int+Int o Prin+Prin).
 * Requiere número par de jugadores y mínimo 4.
 */
export function drawPairs(players: Player[]): Team[] {
  if (players.length < 4) {
    throw new Error("Se necesitan al menos 4 jugadores para sortear");
  }
  if (players.length % 2 !== 0) {
    throw new Error("La cantidad de jugadores debe ser par");
  }
  const intermedios = shuffle(players.filter((p) => p.level === "intermedio"));
  const principiantes = shuffle(players.filter((p) => p.level === "principiante"));
  const teams: Team[] = [];

  const mixed = Math.min(intermedios.length, principiantes.length);
  for (let i = 0; i < mixed; i += 1) {
    teams.push({
      id: newId("t"),
      playerIds: [intermedios[i].id, principiantes[i].id] as [string, string],
    });
  }

  const leftover =
    intermedios.length > principiantes.length
      ? intermedios.slice(mixed)
      : principiantes.slice(mixed);
  for (let i = 0; i < leftover.length; i += 2) {
    teams.push({
      id: newId("t"),
      playerIds: [leftover[i].id, leftover[i + 1].id] as [string, string],
    });
  }

  return teams;
}

const ALL_GROUP_IDS: GroupId[] = ["A", "B", "C", "D"];

/**
 * Heurística por defecto cuando preferredGroupCount === "auto".
 * - <= 5 parejas: 1 grupo (todos contra todos, top 2 a la final)
 * - 6 a 10 parejas: 2 grupos (top 2 de cada → semis cruzadas)
 * - 11+ parejas: 4 grupos (top 1 de cada → semis estándar)
 */
function autoGroupCount(teamsCount: number): 1 | 2 | 4 {
  if (teamsCount <= 5) return 1;
  if (teamsCount <= 10) return 2;
  return 4;
}

/**
 * Decide la cantidad de grupos y sus tamaños.
 * Si `preferred` es "auto", usa la heurística por defecto. Si es 1/2/4, fuerza ese count
 * (con validación: necesita al menos 2 parejas por grupo).
 */
export function planTournament(
  teamsCount: number,
  preferred: PreferredGroupCount = "auto",
): {
  groupCount: 1 | 2 | 4;
  sizes: number[];
} {
  if (teamsCount < 2) {
    throw new Error("Se necesitan al menos 2 parejas");
  }

  let groupCount: 1 | 2 | 4;
  if (preferred === "auto") {
    groupCount = autoGroupCount(teamsCount);
  } else {
    // Mínimo 2 parejas por grupo, sino caemos a la auto
    const minTeamsForCount = preferred * 2;
    groupCount = teamsCount >= minTeamsForCount ? preferred : autoGroupCount(teamsCount);
  }

  const base = Math.floor(teamsCount / groupCount);
  const extra = teamsCount % groupCount;
  const sizes: number[] = [];
  for (let i = 0; i < groupCount; i += 1) {
    sizes.push(i < extra ? base + 1 : base);
  }
  return { groupCount, sizes };
}

/**
 * Pares todos contra todos para N parejas (round-robin).
 * Devuelve los índices, no los teamIds, así el caller arma su matchup.
 */
function roundRobinPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

interface PendingMatch {
  teamA: string;
  teamB: string;
  groupId: GroupId;
  label: string;
}

/**
 * Schedule greedy: asigna cada partido a la primera (round, court) disponible
 * donde la cancha esté libre y ninguna pareja esté jugando otro partido en ese round.
 */
function scheduleMatches(
  pending: PendingMatch[],
  courts: number,
  startRound = 1,
): Match[] {
  const courtsByRound = new Map<number, Set<number>>();
  const teamsByRound = new Map<number, Set<string>>();

  function findSlot(teamA: string, teamB: string): { round: number; court: number } {
    for (let r = startRound; r < startRound + 200; r += 1) {
      const occCourts = courtsByRound.get(r) ?? new Set<number>();
      const occTeams = teamsByRound.get(r) ?? new Set<string>();
      if (occCourts.size >= courts) continue;
      if (occTeams.has(teamA) || occTeams.has(teamB)) continue;
      for (let c = 1; c <= courts; c += 1) {
        if (!occCourts.has(c)) {
          return { round: r, court: c };
        }
      }
    }
    throw new Error("No se pudo agendar el partido (loop)");
  }

  return pending.map((p) => {
    const slot = findSlot(p.teamA, p.teamB);
    if (!courtsByRound.has(slot.round)) courtsByRound.set(slot.round, new Set());
    courtsByRound.get(slot.round)!.add(slot.court);
    if (!teamsByRound.has(slot.round)) teamsByRound.set(slot.round, new Set());
    teamsByRound.get(slot.round)!.add(p.teamA);
    teamsByRound.get(slot.round)!.add(p.teamB);
    return {
      id: newId("m"),
      phase: "groups",
      round: slot.round,
      court: slot.court,
      teamA: p.teamA,
      teamB: p.teamB,
      score: null,
      winner: null,
      status: "pending",
      groupId: p.groupId,
      label: p.label,
    };
  });
}

/**
 * Genera grupos, schedule de fase de grupos y placeholders de fase 2.
 * El formato de la fase 2 depende de cuántos grupos haya.
 */
export function drawGroupsAndMatches(
  teams: Team[],
  config: TournamentConfig,
): {
  teams: Team[];
  groups: Group[];
  matches: Match[];
} {
  if (teams.length < 4) {
    throw new Error(`Se necesitan al menos 4 parejas, hay ${teams.length}`);
  }
  const courts = Math.max(1, Math.min(4, config.courts));
  const plan = planTournament(teams.length, config.preferredGroupCount);
  const shuffled = shuffle(teams);

  const groups: Group[] = [];
  let cursor = 0;
  for (let i = 0; i < plan.groupCount; i += 1) {
    const size = plan.sizes[i];
    const slice = shuffled.slice(cursor, cursor + size);
    cursor += size;
    groups.push({
      id: ALL_GROUP_IDS[i],
      teamIds: slice.map((t) => t.id),
    });
  }

  const teamsWithGroup = teams.map((t) => {
    const g = groups.find((gr) => gr.teamIds.includes(t.id));
    return { ...t, groupId: g?.id };
  });

  // Generar todos los partidos round-robin de todos los grupos
  const pending: PendingMatch[] = [];
  for (const g of groups) {
    const indexPairs = roundRobinPairs(g.teamIds.length);
    for (const [i, j] of indexPairs) {
      pending.push({
        teamA: g.teamIds[i],
        teamB: g.teamIds[j],
        groupId: g.id,
        label: `Grupo ${g.id}`,
      });
    }
  }

  const groupMatches = scheduleMatches(pending, courts);

  // Calcular en qué round arranca la fase 2
  const lastGroupRound = groupMatches.reduce((max, m) => Math.max(max, m.round), 0);
  const phase2Matches = generatePhase2(plan.groupCount, lastGroupRound + 1);

  return {
    teams: teamsWithGroup,
    groups,
    matches: [...groupMatches, ...phase2Matches],
  };
}

function generatePhase2(groupCount: 1 | 2 | 4, startRound: number): Match[] {
  const matches: Match[] = [];

  if (groupCount === 1) {
    matches.push({
      id: newId("m"),
      phase: "final",
      round: startRound,
      court: 1,
      teamA: null,
      teamB: null,
      score: null,
      winner: null,
      status: "pending",
      label: "FINAL (1° vs 2° del grupo)",
    });
    return matches;
  }

  if (groupCount === 2) {
    matches.push({
      id: newId("m"),
      phase: "semis",
      round: startRound,
      court: 1,
      teamA: null,
      teamB: null,
      score: null,
      winner: null,
      status: "pending",
      label: "Semifinal 1 (1°A vs 2°B)",
    });
    matches.push({
      id: newId("m"),
      phase: "semis",
      round: startRound,
      court: 2,
      teamA: null,
      teamB: null,
      score: null,
      winner: null,
      status: "pending",
      label: "Semifinal 2 (1°B vs 2°A)",
    });
    matches.push({
      id: newId("m"),
      phase: "final",
      round: startRound + 1,
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
      round: startRound + 1,
      court: 2,
      teamA: null,
      teamB: null,
      score: null,
      winner: null,
      status: "pending",
      label: "3er puesto",
    });
    return matches;
  }

  // groupCount === 4 (formato Final Four)
  matches.push({
    id: newId("m"),
    phase: "semis",
    round: startRound,
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
    round: startRound,
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
    round: startRound + 1,
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
    round: startRound + 1,
    court: 2,
    teamA: null,
    teamB: null,
    score: null,
    winner: null,
    status: "pending",
    label: "3er puesto",
  });
  return matches;
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
): Array<{
  teamId: string;
  wins: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDiff: number;
}> {
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
  const groupMatches = t.matches.filter((m) => m.phase === "groups");
  if (groupMatches.length === 0) return t;
  const allGroupsDone = groupMatches.every((m) => m.status === "done");
  if (!allGroupsDone) return t;

  const rankings: Record<string, ReturnType<typeof rankGroup>> = {};
  for (const g of t.groups) {
    rankings[g.id] = rankGroup(g, t.matches);
  }

  const groupCount = t.groups.length;
  let matches = t.matches;

  // Llenar semis (o final si solo hay 1 grupo) con los teams correspondientes
  if (groupCount === 1) {
    const ranking = rankings[t.groups[0].id];
    const top1 = ranking[0]?.teamId ?? null;
    const top2 = ranking[1]?.teamId ?? null;
    matches = matches.map((m) => {
      if (m.phase === "final") return { ...m, teamA: top1, teamB: top2 };
      return m;
    });
  } else if (groupCount === 2) {
    const rA = rankings["A"];
    const rB = rankings["B"];
    matches = matches.map((m) => {
      if (m.phase !== "semis") return m;
      if (m.label?.includes("1°A vs 2°B")) {
        return { ...m, teamA: rA[0]?.teamId ?? null, teamB: rB[1]?.teamId ?? null };
      }
      if (m.label?.includes("1°B vs 2°A")) {
        return { ...m, teamA: rB[0]?.teamId ?? null, teamB: rA[1]?.teamId ?? null };
      }
      return m;
    });
  } else {
    // 4 grupos
    matches = matches.map((m) => {
      if (m.phase !== "semis") return m;
      if (m.label?.includes("1°A vs 1°D")) {
        return {
          ...m,
          teamA: rankings["A"]?.[0]?.teamId ?? null,
          teamB: rankings["D"]?.[0]?.teamId ?? null,
        };
      }
      if (m.label?.includes("1°B vs 1°C")) {
        return {
          ...m,
          teamA: rankings["B"]?.[0]?.teamId ?? null,
          teamB: rankings["C"]?.[0]?.teamId ?? null,
        };
      }
      return m;
    });
  }

  // Llenar final + 3° con resultados de semis (si hay)
  const semis = matches.filter((m) => m.phase === "semis");
  if (semis.length === 2 && semis.every((m) => m.status === "done")) {
    const [s1, s2] = semis;
    const finalA = s1.winner;
    const finalB = s2.winner;
    const thirdA = s1.teamA === s1.winner ? s1.teamB : s1.teamA;
    const thirdB = s2.teamA === s2.winner ? s2.teamB : s2.teamA;
    matches = matches.map((m) => {
      if (m.phase === "final") return { ...m, teamA: finalA, teamB: finalB };
      if (m.phase === "third") return { ...m, teamA: thirdA, teamB: thirdB };
      return m;
    });
  }

  const finalMatch = matches.find((m) => m.phase === "final");
  const champion = finalMatch?.status === "done" ? finalMatch.winner : null;

  let state = t.state;
  if (champion) state = "finished";
  else if (allGroupsDone) state = "running";

  return { ...t, matches, champion, state };
}
