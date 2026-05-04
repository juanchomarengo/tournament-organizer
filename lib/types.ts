export type Level = "intermedio" | "principiante";

export interface Player {
  id: string;
  name: string;
  level: Level;
}

export interface Team {
  id: string;
  playerIds: [string, string];
  groupId?: GroupId;
}

export type GroupId = "A" | "B" | "C" | "D";

export interface Group {
  id: GroupId;
  teamIds: string[];
}

export type MatchPhase = "groups" | "semis" | "final" | "third" | "consuelo";

export interface Score {
  setsA: number;
  setsB: number;
  gamesA: number;
  gamesB: number;
}

export interface Match {
  id: string;
  phase: MatchPhase;
  round: number;
  court: number | null;
  teamA: string | null;
  teamB: string | null;
  score: Score | null;
  winner: string | null;
  status: "pending" | "in_progress" | "done";
  groupId?: GroupId;
  label?: string;
}

export type TournamentStateName =
  | "setup"
  | "pairs_drawn"
  | "bracket_drawn"
  | "running"
  | "finished";

export type MatchFormat = "single-set" | "best-of-3";
export type DurationMode = "by-time" | "by-set";
export type PreferredGroupCount = "auto" | 1 | 2 | 4;

export interface TournamentConfig {
  courts: number;
  /**
   * - "by-time": cada ronda tiene una duración fija. Ganador = quien hizo más games.
   * - "by-set": cada partido se juega hasta cerrar el formato (single-set / best-of-3).
   */
  durationMode: DurationMode;
  /** Minutos totales reservados para el evento. */
  totalReservedMinutes: number;
  /** Solo aplica cuando durationMode === "by-set". */
  matchFormat: MatchFormat;
  /** Cantidad de grupos. "auto" usa heurística según parejas. */
  preferredGroupCount: PreferredGroupCount;
  eventStart: string;
  eventLocation: string;
  prizeText: string;
}

export const DEFAULT_CONFIG: TournamentConfig = {
  courts: 4,
  durationMode: "by-time",
  totalReservedMinutes: 90,
  matchFormat: "best-of-3",
  preferredGroupCount: "auto",
  eventStart: "2026-05-06T18:30:00-03:00",
  eventLocation: "Pilar Padel Center",
  prizeText: "2026 World Cup merch",
};

export interface Tournament {
  config: TournamentConfig;
  players: Player[];
  teams: Team[];
  groups: Group[];
  matches: Match[];
  state: TournamentStateName;
  champion: string | null;
  updatedAt: number;
}

export const EMPTY_TOURNAMENT: Tournament = {
  config: DEFAULT_CONFIG,
  players: [],
  teams: [],
  groups: [],
  matches: [],
  state: "setup",
  champion: null,
  updatedAt: 0,
};
