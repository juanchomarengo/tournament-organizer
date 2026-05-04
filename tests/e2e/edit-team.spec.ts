import { test, expect } from "@playwright/test";
import {
  drawPairs,
  getState,
  loginAdmin,
  resetTournament,
  seedPlayers,
} from "./helpers";

test.describe("Editar pareja (3 casos en una sola tool)", () => {
  test.beforeEach(async ({ request }) => {
    await resetTournament(request);
  });

  test("Caso 1: swap entre 2 parejas — el otro jugador queda en la otra pareja", async ({
    page,
  }) => {
    const req = page.context().request;
    await loginAdmin(req);
    await seedPlayers(req);
    await drawPairs(req);

    let s = await getState(req);
    const team1 = s.teams[0];
    const team2 = s.teams[1];
    const t1Player0 = team1.playerIds[0];
    const t2Player0 = team2.playerIds[0];

    await page.goto("/admin");
    // Click "Editar" del primer pareja
    await page.getByRole("button", { name: /^Editar pareja P\d+$/ }).first().click();
    await expect(page.getByText("Editar pareja P1")).toBeVisible();

    // Cambiar Jugador 1 al primer jugador de P2
    const t2Player0Name = s.players.find((p: any) => p.id === t2Player0)!.name;
    // Hay 2 selects (jugador 1 y jugador 2). Tomo el primero.
    const select = page.getByRole("combobox").first();
    await select.selectOption({ value: `existing:${t2Player0}` });
    await expect(page.getByText(/está en P2/)).toBeVisible();
    await page.getByRole("button", { name: "Aplicar cambios" }).click();
    await page.getByRole("button", { name: "Aplicar cambios" }).waitFor({ state: "hidden" });

    // Verificar el state
    s = await getState(req);
    const newTeam1 = s.teams.find((t: any) => t.id === team1.id);
    const newTeam2 = s.teams.find((t: any) => t.id === team2.id);
    expect(newTeam1.playerIds[0]).toBe(t2Player0);
    expect(newTeam2.playerIds.includes(t1Player0)).toBe(true);
    void t2Player0Name;
  });

  test("Caso 2: reemplazo por jugador nuevo (no estaba en el torneo)", async ({
    page,
  }) => {
    const req = page.context().request;
    await loginAdmin(req);
    await seedPlayers(req);
    await drawPairs(req);

    let s = await getState(req);
    const team1 = s.teams[0];
    const originalPlayerCount = s.players.length;

    await page.goto("/admin");
    // Esperar a que la lista de parejas esté renderizada
    await expect(page.getByRole("button", { name: "Editar pareja P1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Editar pareja P1", exact: true }).click();
    await expect(page.getByText("Editar pareja P1")).toBeVisible();

    // Elegir "Crear jugador nuevo" en el primer slot
    const select = page.getByRole("combobox").first();
    await select.selectOption({ value: "__new__" });

    await page.getByPlaceholder("Nombre del nuevo jugador").fill("Sustituto Externo");

    // Esperar PUT response
    const putPromise = page.waitForResponse(
      (r) => r.url().endsWith("/api/state") && r.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Aplicar cambios" }).click();
    await putPromise;

    s = await getState(req);
    expect(s.players).toHaveLength(originalPlayerCount + 1);
    const newTeam1 = s.teams.find((t: any) => t.id === team1.id);
    const newPlayer = s.players.find((p: any) => p.name === "Sustituto Externo");
    expect(newPlayer).toBeTruthy();
    expect(newTeam1.playerIds.includes(newPlayer.id)).toBe(true);
  });

  test("Caso 3: el teamId se mantiene → resultados ya cargados no se rompen", async ({
    page,
    request,
  }) => {
    const req = page.context().request;
    await loginAdmin(req);
    await seedPlayers(req);
    await drawPairs(req);

    // Hacer un sorteo de grupos y cerrar 1 partido
    await req.post("/api/draw/groups");
    let s = await getState(req);
    const firstMatch = s.matches.find((m: any) => m.phase === "groups");
    await req.patch(`/api/match/${firstMatch.id}`, {
      data: {
        score: { setsA: 2, setsB: 1, gamesA: 12, gamesB: 8 },
        winner: firstMatch.teamA,
        status: "done",
      },
    });

    s = await getState(req);
    const winnerTeamBefore = s.matches.find((m: any) => m.id === firstMatch.id).winner;

    // Editar la pareja ganadora reemplazando un jugador con uno nuevo
    const winnerTeam = s.teams.find((t: any) => t.id === winnerTeamBefore);

    await page.goto("/admin");
    // Buscar el botón Editar de la pareja ganadora
    const teamIndex = s.teams.findIndex((t: any) => t.id === winnerTeam.id);
    await page
      .getByRole("button", { name: `Editar pareja P${teamIndex + 1}`, exact: true })
      .click();

    const select = page.getByRole("combobox").first();
    await select.selectOption({ value: "__new__" });
    await page.getByPlaceholder("Nombre del nuevo jugador").fill("Sustituto Tardío");
    await page.getByRole("button", { name: "Aplicar cambios" }).click();
    await page.getByRole("button", { name: "Aplicar cambios" }).waitFor({ state: "hidden" });

    s = await getState(req);

    // El match cerrado mantiene su winner apuntando al teamId original
    const matchAfter = s.matches.find((m: any) => m.id === firstMatch.id);
    expect(matchAfter.winner).toBe(winnerTeamBefore);
    expect(matchAfter.status).toBe("done");
    expect(matchAfter.score).toEqual({ setsA: 2, setsB: 1, gamesA: 12, gamesB: 8 });

    // La pareja sigue existiendo con el mismo id pero playerIds diferentes
    const winnerTeamAfter = s.teams.find((t: any) => t.id === winnerTeamBefore);
    const newPlayer = s.players.find((p: any) => p.name === "Sustituto Tardío");
    expect(winnerTeamAfter.playerIds.includes(newPlayer.id)).toBe(true);

    void request;
  });
});
