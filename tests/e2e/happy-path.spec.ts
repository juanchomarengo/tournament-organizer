import { test, expect } from "@playwright/test";
import {
  closeMatch,
  drawGroups,
  drawPairs,
  getState,
  logoutAdmin,
  resetTournament,
  seedPlayers,
} from "./helpers";

test.describe("Happy path completo", () => {
  test.beforeEach(async ({ request }) => {
    await resetTournament(request);
  });

  test.afterAll(async ({ request }) => {
    await resetTournament(request);
    await logoutAdmin(request);
  });

  test("setup → sorteo → grupos → 12 partidos → semis → final → campeón", async ({
    page,
    request,
  }) => {
    // Setup: cargar 24 jugadores
    await seedPlayers(request);
    let state = await getState(request);
    expect(state.players).toHaveLength(24);

    // Sortear parejas
    await drawPairs(request);
    state = await getState(request);
    expect(state.teams).toHaveLength(12);
    expect(state.state).toBe("pairs_drawn");

    // Verificar regla de niveles: cada pareja tiene 1 intermedio + 1 principiante
    const playerById = Object.fromEntries(state.players.map((p: any) => [p.id, p]));
    for (const team of state.teams) {
      const a = playerById[team.playerIds[0]];
      const b = playerById[team.playerIds[1]];
      expect(new Set([a.level, b.level])).toEqual(new Set(["intermedio", "principiante"]));
    }

    // Sortear grupos
    await drawGroups(request);
    state = await getState(request);
    expect(state.groups).toHaveLength(4);
    expect(state.state).toBe("bracket_drawn");
    expect(state.matches.filter((m: any) => m.phase === "groups")).toHaveLength(12);

    // Cerrar todos los partidos de grupo (gana siempre teamA)
    for (const m of state.matches.filter((mm: any) => mm.phase === "groups")) {
      await closeMatch(request, m.id, m.teamA);
    }
    state = await getState(request);
    expect(state.state).toBe("running");

    // Las semis ahora deben tener teamA y teamB asignados (auto-fill)
    const semis = state.matches.filter((m: any) => m.phase === "semis");
    expect(semis).toHaveLength(2);
    for (const s of semis) {
      expect(s.teamA).not.toBeNull();
      expect(s.teamB).not.toBeNull();
    }

    // Cerrar las dos semis (gana teamA)
    for (const s of semis) await closeMatch(request, s.id, s.teamA);
    state = await getState(request);

    // Final y 3er puesto deben estar pobladas
    const final = state.matches.find((m: any) => m.phase === "final");
    const third = state.matches.find((m: any) => m.phase === "third");
    expect(final.teamA).not.toBeNull();
    expect(final.teamB).not.toBeNull();
    expect(third.teamA).not.toBeNull();
    expect(third.teamB).not.toBeNull();

    // Cerrar 3er puesto y final
    await closeMatch(request, third.id, third.teamA);
    await closeMatch(request, final.id, final.teamA);
    state = await getState(request);
    expect(state.state).toBe("finished");
    expect(state.champion).toBe(final.teamA);

    // Verificar que /bracket muestra al campeón
    await page.goto("/bracket");
    await expect(page.getByText("Campeones del Sirius Padel Tournament")).toBeVisible({
      timeout: 10000,
    });

    // Y la home dice "Finalizado"
    await page.goto("/");
    await expect(page.getByText("Finalizado")).toBeVisible({ timeout: 10000 });
  });
});
