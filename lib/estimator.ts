import type { MatchFormat, PreferredGroupCount } from "./types";
import { planTournament } from "./draw";

export interface TournamentPlan {
  groupCount: 1 | 2 | 4;
  sizes: number[];
  groupMatches: number;
  playoffMatches: number;
  totalMatches: number;
  groupRounds: number;
  playoffRounds: number;
  totalRounds: number;
}

/**
 * Calcula la estructura del torneo a partir de cantidad de parejas y canchas.
 * Determinístico (no usa random).
 */
export function calculatePlan(
  teamsCount: number,
  courts: number,
  preferred: PreferredGroupCount = "auto",
): TournamentPlan {
  if (teamsCount < 4) {
    return {
      groupCount: 1,
      sizes: [teamsCount],
      groupMatches: 0,
      playoffMatches: 0,
      totalMatches: 0,
      groupRounds: 0,
      playoffRounds: 0,
      totalRounds: 0,
    };
  }
  const courtsClamped = Math.max(1, Math.min(4, courts));
  const { groupCount, sizes } = planTournament(teamsCount, preferred);

  // Partidos por grupo: round-robin = C(n, 2)
  const groupMatches = sizes.reduce((s, n) => s + (n * (n - 1)) / 2, 0);

  // Cota inferior de rondas por grupo (round-robin clásico):
  // n par → n-1 rondas, n impar → n rondas
  const minRoundsPerGroup = sizes.map((n) => (n % 2 === 0 ? n - 1 : n));
  const maxGroupInternalRounds = Math.max(...minRoundsPerGroup);
  const groupRounds = Math.max(
    Math.ceil(groupMatches / courtsClamped),
    maxGroupInternalRounds,
  );

  // Playoffs:
  // 1 grupo: solo final (1 ronda)
  // 2 o 4 grupos: 2 semis (1 ronda paralela) + final + 3° (1 ronda paralela)
  const playoffMatches = groupCount === 1 ? 1 : 4;
  const playoffRounds = groupCount === 1 ? 1 : 2;

  const totalMatches = groupMatches + playoffMatches;
  const totalRounds = groupRounds + playoffRounds;

  return {
    groupCount,
    sizes,
    groupMatches,
    playoffMatches,
    totalMatches,
    groupRounds,
    playoffRounds,
    totalRounds,
  };
}

/**
 * Minutos estimados por partido según formato.
 * single-set (a 6 games con tie-break): ~25 min
 * best-of-3 (mejor de 3 sets): ~60 min
 * Son valores referenciales; un torneo casual de oficina suele ser más corto.
 */
export function estimateMatchMinutes(format: MatchFormat): number {
  switch (format) {
    case "single-set":
      return 25;
    case "best-of-3":
      return 60;
  }
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const hours = Math.floor(min / 60);
  const remaining = Math.round(min - hours * 60);
  if (remaining === 0) return `${hours} h`;
  return `${hours}:${String(remaining).padStart(2, "0")} h`;
}
