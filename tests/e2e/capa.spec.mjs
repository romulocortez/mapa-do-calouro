import { test, expect, abrirMapa } from "./_base.mjs";

test("a interface do mapa só aparece depois do juramento", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#cover")).toBeVisible();
  expect(await page.locator("#panel").evaluate(e => getComputedStyle(e).visibility)).toBe("hidden");
  await page.locator("#openMap").click();
  await expect(page.locator("#cover")).toBeHidden();
  expect(await page.locator("#panel").evaluate(e => getComputedStyle(e).visibility)).toBe("visible");
});

test("a capa continua legível com o celular no modo escuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const cor = await page.locator(".cover-card .messrs b").first().evaluate(e => getComputedStyle(e).color);
  expect(cor).toBe("rgb(59, 36, 20)");          // tinta escura sobre o pergaminho claro
});

test("sem JavaScript (pré-visualização do iPhone), a capa explica o que fazer", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4173/");
  await expect(page.locator(".cv-noscript")).toBeVisible();
  await ctx.close();
});

test("abre e mostra a barra do topo no celular", async ({ page, isMobile }) => {
  test.skip(!isMobile, "só no celular");
  await abrirMapa(page);
  await expect(page.locator("#topbar")).toBeVisible();
});
