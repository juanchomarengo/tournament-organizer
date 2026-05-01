import type { APIRequestContext, Page } from "@playwright/test";

export const ADMIN_PASSWORD = "padel2026";

const PLAYERS_24 = [
  { id: "p1", name: "Carola", level: "intermedio" },
  { id: "p2", name: "Juancho", level: "intermedio" },
  { id: "p3", name: "Nesti", level: "intermedio" },
  { id: "p4", name: "Santi Grimoldi", level: "intermedio" },
  { id: "p5", name: "Chulo", level: "intermedio" },
  { id: "p6", name: "Maxi Geist", level: "intermedio" },
  { id: "p7", name: "Fede Bustos", level: "intermedio" },
  { id: "p8", name: "Sofi Tartara", level: "intermedio" },
  { id: "p9", name: "Emi López", level: "intermedio" },
  { id: "p10", name: "Nacho", level: "intermedio" },
  { id: "p11", name: "Agus Vilchez", level: "intermedio" },
  { id: "p12", name: "Invitado A", level: "intermedio" },
  { id: "p13", name: "Agustín", level: "principiante" },
  { id: "p14", name: "Lucas Barbeito", level: "principiante" },
  { id: "p15", name: "Santino Montevidoni", level: "principiante" },
  { id: "p16", name: "Clari", level: "principiante" },
  { id: "p17", name: "Marcos Lund", level: "principiante" },
  { id: "p18", name: "Santi Aguilar", level: "principiante" },
  { id: "p19", name: "Martín Barreiro", level: "principiante" },
  { id: "p20", name: "Don Pablo", level: "principiante" },
  { id: "p21", name: "Santi Pérez", level: "principiante" },
  { id: "p22", name: "Gonza Oxoby", level: "principiante" },
  { id: "p23", name: "Invitada B", level: "principiante" },
  { id: "p24", name: "Invitado C", level: "principiante" },
];

export async function loginAdmin(request: APIRequestContext) {
  const res = await request.post("/api/auth", {
    data: { password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
}

export async function logoutAdmin(request: APIRequestContext) {
  await request.delete("/api/auth");
}

export async function resetTournament(request: APIRequestContext) {
  await loginAdmin(request);
  const res = await request.put("/api/state", {
    data: {
      players: [],
      teams: [],
      groups: [],
      matches: [],
      state: "setup",
      champion: null,
      updatedAt: 0,
    },
  });
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`);
}

export async function seedPlayers(request: APIRequestContext) {
  await loginAdmin(request);
  const res = await request.put("/api/state", {
    data: {
      players: PLAYERS_24,
      teams: [],
      groups: [],
      matches: [],
      state: "setup",
      champion: null,
      updatedAt: 0,
    },
  });
  if (!res.ok()) throw new Error(`seed failed: ${res.status()}`);
}

export async function drawPairs(request: APIRequestContext) {
  const res = await request.post("/api/draw/pairs");
  if (!res.ok()) throw new Error(`draw pairs failed: ${res.status()}`);
}

export async function drawGroups(request: APIRequestContext) {
  const res = await request.post("/api/draw/groups");
  if (!res.ok()) throw new Error(`draw groups failed: ${res.status()}`);
}

export async function getState(request: APIRequestContext) {
  const res = await request.get("/api/state");
  if (!res.ok()) throw new Error(`get state failed: ${res.status()}`);
  return res.json();
}

export async function closeMatch(
  request: APIRequestContext,
  matchId: string,
  winnerTeamId: string,
) {
  const res = await request.patch(`/api/match/${matchId}`, {
    data: {
      score: { setsA: 2, setsB: 1, gamesA: 12, gamesB: 8 },
      winner: winnerTeamId,
      status: "done",
    },
  });
  if (!res.ok()) throw new Error(`close match failed: ${res.status()}`);
}

export async function loginUI(page: Page) {
  await page.goto("/admin");
  await page.getByPlaceholder("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("/admin");
  await page.getByText("Panel del torneo").waitFor({ state: "visible" });
}
