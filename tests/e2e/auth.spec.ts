import { test, expect } from "@playwright/test";
import { ADMIN_PASSWORD, logoutAdmin, resetTournament } from "./helpers";

test.describe("Auth", () => {
  test.beforeEach(async ({ request }) => {
    await resetTournament(request);
    await logoutAdmin(request);
  });

  test("usuario no logueado no ve el link Admin en el header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Inicio" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Sorteo" })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "Bracket" })).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Cronograma" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin" }),
    ).toHaveCount(0);
  });

  test("/admin sin login muestra formulario de acceso", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Acceso admin" })).toBeVisible();
    await expect(page.getByPlaceholder("Contraseña")).toBeVisible();
  });

  test("login con password incorrecto muestra error", async ({ page }) => {
    await page.goto("/admin");
    await page.getByPlaceholder("Contraseña").fill("wrong-password");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Contraseña incorrecta")).toBeVisible();
  });

  test("login correcto entra al panel y muestra link Admin", async ({ page }) => {
    await page.goto("/admin");
    await page.getByPlaceholder("Contraseña").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Panel del torneo")).toBeVisible();
    // Volver a home y verificar que ahora SÍ está el link Admin
    await page.goto("/");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Admin" }),
    ).toBeVisible();
  });

  test("PUT /api/state sin auth devuelve 401", async ({ request }) => {
    const res = await request.put("/api/state", {
      data: { players: [], teams: [], groups: [], matches: [], state: "setup", champion: null, updatedAt: 0 },
    });
    expect(res.status()).toBe(401);
  });
});
