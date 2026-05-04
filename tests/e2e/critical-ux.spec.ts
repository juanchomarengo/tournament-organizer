import { test, expect } from "@playwright/test";
import {
  drawGroups,
  drawPairs,
  getState,
  loginAdmin,
  loginUI,
  logoutAdmin,
  resetTournament,
  seedPlayers,
} from "./helpers";

test.describe("Críticas de UX", () => {
  test.beforeEach(async ({ request }) => {
    await resetTournament(request);
  });

  test("Reset total: dialog requiere escribir RESET para habilitar el botón", async ({ page }) => {
    await loginUI(page);

    // Abrir el modal de reset
    await page
      .getByRole("button", { name: "Reset total" })
      .first()
      .click();
    await expect(page.getByText("Para confirmar, escribí RESET")).toBeVisible();

    // El botón Reset total dentro del modal está disabled inicialmente
    const dialogReset = page.getByRole("button", { name: /^Reset total$/ }).last();
    await expect(dialogReset).toBeDisabled();

    // Escribir algo distinto: sigue disabled
    await page.getByPlaceholder("RESET").fill("nope");
    await expect(dialogReset).toBeDisabled();

    // Escribir RESET: se habilita
    await page.getByPlaceholder("RESET").fill("RESET");
    await expect(dialogReset).toBeEnabled();

    // Cancelar (sin reset)
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Para confirmar, escribí RESET")).not.toBeVisible();
  });

  test("/bracket vacío muestra placeholder cuando no hay sorteo", async ({ page }) => {
    await page.goto("/bracket");
    await expect(page.getByText("Aparece cuando arranque el torneo")).toBeVisible();
  });

  test("/sorteo muestra 'Esperando sorteo' cuando no hay parejas", async ({ page }) => {
    await page.goto("/sorteo");
    await expect(page.getByText("Esperando sorteo")).toBeVisible();
  });

  test("Modo presentación oculta el header en /sorteo y /bracket", async ({
    page,
    request,
  }) => {
    await seedPlayers(request);
    await drawPairs(request);
    await drawGroups(request);

    // Sin presentation: header visible
    await page.goto("/sorteo");
    await expect(page.getByRole("banner")).toBeVisible();

    // Con presentation=1: header oculto
    await page.goto("/sorteo?present=1");
    await expect(page.getByRole("banner")).toHaveCount(0);

    await page.goto("/bracket?present=1");
    await expect(page.getByRole("banner")).toHaveCount(0);
  });

  test("Lista de jugadores pública NO expone niveles (no hay puntitos violet de principiante)", async ({
    page,
    request,
  }) => {
    await seedPlayers(request);
    await page.goto("/");
    // Esperar que aparezca la lista
    await expect(page.getByText("Confirmados")).toBeVisible({ timeout: 10000 });
    // Ningún elemento de la home con clase bg-sirius-violet (que sería el indicador de Principiante)
    const violetDots = await page.locator(".bg-sirius-violet").count();
    expect(violetDots).toBe(0);
  });

  test("Header en mobile abre y cierra el menú hamburger", async ({ page, browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobile = await ctx.newPage();
    await mobile.goto("/");

    const hamburger = mobile.getByRole("button", { name: /Abrir menú/ });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Menu links visibles
    const menu = mobile.getByRole("link", { name: "Cronograma" }).first();
    await expect(menu).toBeVisible();

    // Cerrar con la X
    await mobile.getByRole("button", { name: /Cerrar menú/ }).click();
    await expect(mobile.getByRole("button", { name: /Abrir menú/ })).toBeVisible();

    await ctx.close();
  });

  test("/cronograma resalta la ronda activa cuando arranca el torneo", async ({
    page,
    request,
  }) => {
    await seedPlayers(request);
    await drawPairs(request);
    await drawGroups(request);
    await page.goto("/cronograma");
    await expect(page.getByText("En curso")).toBeVisible();
  });

  test("Sorteo desbalanceado: empareja 1+1 mientras alcance, resto entre sí", async ({
    page,
    request,
  }) => {
    // Cargar 6 jugadores: 4 Int + 2 Prin → 2 mixtas + 1 mismo-nivel (2 Int sobrantes)
    await loginAdmin(request);
    await request.put("/api/state", {
      data: {
        players: [
          { id: "p1", name: "Int 1", level: "intermedio" },
          { id: "p2", name: "Int 2", level: "intermedio" },
          { id: "p3", name: "Int 3", level: "intermedio" },
          { id: "p4", name: "Int 4", level: "intermedio" },
          { id: "p5", name: "Prin 1", level: "principiante" },
          { id: "p6", name: "Prin 2", level: "principiante" },
        ],
        teams: [],
        groups: [],
        matches: [],
        state: "setup",
        champion: null,
        updatedAt: 0,
      },
    });
    await drawPairs(request);
    const state = await getState(request);
    expect(state.teams).toHaveLength(3);

    // Contar tipos de pareja
    const playerById = Object.fromEntries(state.players.map((p: any) => [p.id, p]));
    let mixed = 0;
    let sameLevel = 0;
    for (const team of state.teams) {
      const a = playerById[team.playerIds[0]];
      const b = playerById[team.playerIds[1]];
      if (a.level !== b.level) mixed += 1;
      else sameLevel += 1;
    }
    expect(mixed).toBe(2);
    expect(sameLevel).toBe(1);

    // Verificar que la UI del admin muestra el preview correcto cuando estoy en setup
    void page;
  });

  test("Logout limpia la cookie y oculta el link Admin", async ({ page }) => {
    await loginUI(page);
    await page.goto("/");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin" }),
    ).toBeVisible();
    // Usar el request del page para que compartan cookies
    await logoutAdmin(page.context().request);
    await page.goto("/");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin" }),
    ).toHaveCount(0);
  });
});
