import * as XLSX from "xlsx";
import { teamLabel } from "./draw";
import type { Tournament } from "./types";

export function tournamentToWorkbook(t: Tournament): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const playersRows = t.players.map((p) => ({
    id: p.id,
    nombre: p.name,
    nivel: p.level,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(playersRows),
    "Jugadores",
  );

  const teamsRows = t.teams.map((team, idx) => ({
    nro: idx + 1,
    pareja: teamLabel(team, t.players),
    grupo: team.groupId ?? "",
    jugadorA: t.players.find((p) => p.id === team.playerIds[0])?.name ?? "",
    jugadorB: t.players.find((p) => p.id === team.playerIds[1])?.name ?? "",
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(teamsRows),
    "Parejas",
  );

  const groupsRows = t.groups.flatMap((g) =>
    g.teamIds.map((teamId) => {
      const team = t.teams.find((tt) => tt.id === teamId);
      return {
        grupo: g.id,
        pareja: teamLabel(team, t.players),
      };
    }),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(groupsRows),
    "Grupos",
  );

  const matchesRows = t.matches.map((m) => {
    const a = t.teams.find((tt) => tt.id === m.teamA);
    const b = t.teams.find((tt) => tt.id === m.teamB);
    const winner = t.teams.find((tt) => tt.id === m.winner);
    return {
      ronda: m.round,
      cancha: m.court ?? "",
      fase: m.label ?? m.phase,
      grupo: m.groupId ?? "",
      parejaA: a ? teamLabel(a, t.players) : "Por definir",
      parejaB: b ? teamLabel(b, t.players) : "Por definir",
      sets: m.score ? `${m.score.setsA}-${m.score.setsB}` : "",
      games: m.score ? `${m.score.gamesA}-${m.score.gamesB}` : "",
      ganador: winner ? teamLabel(winner, t.players) : "",
      estado: m.status,
    };
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(matchesRows),
    "Partidos",
  );

  const champion = t.teams.find((tt) => tt.id === t.champion);
  const summaryRows = [
    { campo: "estado", valor: t.state },
    {
      campo: "campeón",
      valor: champion ? teamLabel(champion, t.players) : "—",
    },
    {
      campo: "actualizado",
      valor: new Date(t.updatedAt).toLocaleString(),
    },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    "Resumen",
  );

  return wb;
}

export function downloadXlsx(t: Tournament, filename = "sirius-padel.xlsx"): void {
  const wb = tournamentToWorkbook(t);
  XLSX.writeFile(wb, filename);
}

export function downloadJson(t: Tournament, filename = "sirius-padel.json"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<Tournament> {
  const text = await file.text();
  return JSON.parse(text) as Tournament;
}
