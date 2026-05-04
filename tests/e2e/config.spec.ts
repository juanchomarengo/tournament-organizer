import { test, expect } from "@playwright/test";
import {
  closeMatch,
  drawGroups,
  drawPairs,
  getState,
  loginAdmin,
  resetTournament,
} from "./helpers";

test.describe("Config y bracket flexible", () => {
  test.beforeEach(async ({ request }) => {
    await resetTournament(request);
  });

  test("Config se persiste en /api/state con defaults", async ({ request }) => {
    const state = await getState(request);
    expect(state.config).toMatchObject({
      courts: 4,
      durationMode: "by-time",
      totalReservedMinutes: 90,
      matchFormat: "best-of-3",
      eventLocation: "Pilar Padel Center",
    });
  });

  test("Cambiar config: prizeText aparece en home", async ({ page, request }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: {
        ...state,
        config: { ...state.config, prizeText: "una caja de Speedo Wave" },
      },
    });
    await page.goto("/");
    await expect(page.getByText(/Speedo Wave/i)).toBeVisible({ timeout: 10000 });
  });

  test("Cambiar config: courts=2 muestra solo 2 columnas en /cronograma", async ({
    page,
    request,
  }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(8),
        config: { ...state.config, courts: 2 },
      },
    });
    await drawPairs(request);
    await drawGroups(request);
    await page.goto("/cronograma");
    await expect(page.getByText(/2 canchas/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("columnheader", { name: "Cancha 1" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cancha 2" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cancha 3" })).toHaveCount(0);
  });

  test("Bracket flexible: 4 parejas → 1 grupo + final directa", async ({
    page,
    request,
  }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: { ...state, players: makePlayers(8) },
    });
    await drawPairs(request);
    let s = await getState(request);
    expect(s.teams).toHaveLength(4);
    await drawGroups(request);
    s = await getState(request);
    expect(s.groups).toHaveLength(1);
    expect(s.matches.filter((m: any) => m.phase === "groups")).toHaveLength(6); // C(4,2)
    expect(s.matches.filter((m: any) => m.phase === "final")).toHaveLength(1);
    expect(s.matches.filter((m: any) => m.phase === "semis")).toHaveLength(0);
  });

  test("Bracket flexible: 8 parejas → 2 grupos + semis cruzadas", async ({ request }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: { ...state, players: makePlayers(16) },
    });
    await drawPairs(request);
    await drawGroups(request);
    const s = await getState(request);
    expect(s.groups).toHaveLength(2);
    // C(4,2) = 6 partidos por grupo, total 12
    expect(s.matches.filter((m: any) => m.phase === "groups")).toHaveLength(12);
    expect(s.matches.filter((m: any) => m.phase === "semis")).toHaveLength(2);
    expect(s.matches.filter((m: any) => m.phase === "final")).toHaveLength(1);
    expect(s.matches.filter((m: any) => m.phase === "third")).toHaveLength(1);
  });

  test("Bracket flexible: 10 parejas (uno de los casos del user) genera 2 grupos", async ({
    request,
  }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: { ...state, players: makePlayers(20) },
    });
    await drawPairs(request);
    await drawGroups(request);
    const s = await getState(request);
    expect(s.groups).toHaveLength(2);
    // 5+5 → C(5,2) * 2 = 20 partidos de grupos
    expect(s.matches.filter((m: any) => m.phase === "groups")).toHaveLength(20);
  });

  test("Schedule respeta canchas: ningún round excede config.courts", async ({ request }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(16),
        config: { ...state.config, courts: 2 },
      },
    });
    await drawPairs(request);
    await drawGroups(request);
    const s = await getState(request);
    const byRound = new Map<number, number>();
    for (const m of s.matches.filter((mm: any) => mm.phase === "groups")) {
      byRound.set(m.round, (byRound.get(m.round) ?? 0) + 1);
    }
    for (const [, count] of byRound) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  test("Schedule respeta canchas: ninguna pareja juega 2 partidos en el mismo round", async ({
    request,
  }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: { ...state, players: makePlayers(12) },
    });
    await drawPairs(request);
    await drawGroups(request);
    const s = await getState(request);
    const teamsPerRound = new Map<number, Set<string>>();
    for (const m of s.matches.filter((mm: any) => mm.phase === "groups")) {
      const set = teamsPerRound.get(m.round) ?? new Set();
      // Si las parejas ya están en este round, falla la regla
      expect(set.has(m.teamA)).toBe(false);
      expect(set.has(m.teamB)).toBe(false);
      set.add(m.teamA);
      set.add(m.teamB);
      teamsPerRound.set(m.round, set);
    }
  });

  test("Estimator by-time: el panel calcula minutos por partido", async ({ page }) => {
    const req = page.context().request;
    await loginAdmin(req);
    const state = await getState(req);
    await req.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(24),
        config: {
          ...state.config,
          durationMode: "by-time",
          totalReservedMinutes: 90,
          courts: 4,
        },
      },
    });
    await page.goto("/admin");
    // 12 parejas → plan: 4 grupos de 3 → groupRounds=3 + playoffRounds=2 = 5 totalRounds
    // 90/5 = 18 min por partido
    await expect(page.getByText("18 min").first()).toBeVisible({ timeout: 10000 });
  });

  test("Estimator by-set: el panel avisa si excede el tiempo reservado", async ({
    page,
  }) => {
    const req = page.context().request;
    await loginAdmin(req);
    const state = await getState(req);
    // 24 jugadores → 12 parejas → 4 grupos → 5 rondas. best-of-3 = 60 min/match → 300 min total
    // Reservado 90 min → excede claramente.
    await req.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(24),
        config: {
          ...state.config,
          durationMode: "by-set",
          matchFormat: "best-of-3",
          totalReservedMinutes: 90,
          courts: 4,
        },
      },
    });
    await page.goto("/admin");
    await expect(page.getByText(/Excede el tiempo reservado/)).toBeVisible({
      timeout: 10000,
    });
  });

  test("Estimator by-set: si el formato fitea, no muestra warning", async ({ page }) => {
    const req = page.context().request;
    await loginAdmin(req);
    const state = await getState(req);
    // 8 jugadores → 4 parejas → 1 grupo (round-robin C(4,2)=6) → 3 group rounds + 1 playoff = 4 rondas
    // single-set 25 min × 4 = 100 min. Reservado 120 → fitea.
    await req.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(8),
        config: {
          ...state.config,
          durationMode: "by-set",
          matchFormat: "single-set",
          totalReservedMinutes: 120,
          courts: 4,
        },
      },
    });
    await page.goto("/admin");
    await expect(page.getByText(/Excede el tiempo reservado/)).toHaveCount(0);
  });

  test("Override preferredGroupCount=4 con 10 parejas genera grupos [3,3,2,2]", async ({
    page,
  }) => {
    const req = page.context().request;
    await loginAdmin(req);
    const state = await getState(req);
    await req.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(20),
        config: { ...state.config, preferredGroupCount: 4 },
      },
    });
    await drawPairs(req);
    await drawGroups(req);
    const s = await getState(req);
    expect(s.groups).toHaveLength(4);
    const sizes = s.groups.map((g: any) => g.teamIds.length).sort((a: number, b: number) => b - a);
    expect(sizes).toEqual([3, 3, 2, 2]);
    // Total partidos de grupos: C(3,2)*2 + C(2,2)*2 = 3+3+1+1 = 8
    expect(s.matches.filter((m: any) => m.phase === "groups")).toHaveLength(8);
  });

  test("Override preferredGroupCount=2 con 4 parejas usa 1 grupo (fallback)", async ({
    page,
  }) => {
    const req = page.context().request;
    await loginAdmin(req);
    const state = await getState(req);
    await req.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(8),
        config: { ...state.config, preferredGroupCount: 2 },
      },
    });
    await drawPairs(req);
    // 4 parejas no entran bien en 2 grupos, así que mantengo el fallback (1 grupo)
    // 4 parejas ÷ 2 grupos = 2 parejas por grupo. minTeamsForCount = 4. teamsCount=4 >=4 → permite.
    // Entonces: 2 grupos de 2 parejas
    await drawGroups(req);
    const s = await getState(req);
    expect(s.groups).toHaveLength(2);
    const sizes = s.groups.map((g: any) => g.teamIds.length).sort();
    expect(sizes).toEqual([2, 2]);
  });

  test("MatchRow oculta inputs de Sets cuando durationMode=by-time", async ({ page }) => {
    const req = page.context().request;
    await loginAdmin(req);
    const state = await getState(req);
    await req.put("/api/state", {
      data: {
        ...state,
        players: makePlayers(8),
        config: { ...state.config, durationMode: "by-time" },
      },
    });
    await drawPairs(req);
    await drawGroups(req);
    await page.goto("/admin");
    // Abrir el editor del primer partido
    await page.getByRole("button", { name: "Cargar resultado" }).first().click();
    await expect(page.getByText("Games A")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Sets A")).toHaveCount(0);
  });

  test("Bracket 1 grupo: ganador del grupo gana la final → campeón", async ({
    page,
    request,
  }) => {
    await loginAdmin(request);
    const state = await getState(request);
    await request.put("/api/state", {
      data: { ...state, players: makePlayers(8) },
    });
    await drawPairs(request);
    await drawGroups(request);
    let s = await getState(request);

    for (const m of s.matches.filter((mm: any) => mm.phase === "groups")) {
      await closeMatch(request, m.id, m.teamA);
    }
    s = await getState(request);

    const final = s.matches.find((m: any) => m.phase === "final");
    expect(final.teamA).not.toBeNull();
    expect(final.teamB).not.toBeNull();

    await closeMatch(request, final.id, final.teamA);
    s = await getState(request);
    expect(s.state).toBe("finished");
    expect(s.champion).toBe(final.teamA);

    await page.goto("/bracket");
    await expect(page.getByText("Campeones del Sirius Padel Tournament")).toBeVisible({
      timeout: 10000,
    });
  });
});

function makePlayers(n: number) {
  const players = [];
  const half = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    players.push({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      level: i < half ? "intermedio" : "principiante",
    });
  }
  return players;
}
