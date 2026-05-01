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

export interface Tournament {
  players: Player[];
  teams: Team[];
  groups: Group[];
  matches: Match[];
  state: TournamentStateName;
  champion: string | null;
  updatedAt: number;
}

export const EMPTY_TOURNAMENT: Tournament = {
  players: [],
  teams: [],
  groups: [],
  matches: [],
  state: "setup",
  champion: null,
  updatedAt: 0,
};
