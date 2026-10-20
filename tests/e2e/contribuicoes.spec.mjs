import { test, expect, abrirMapa, FIXTURES } from "./_base.mjs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-banco.js" });
  await page.addInitScript({ path: FIXTURES + "mock-contribuicoes.js" });
});

test("a coordenação aprova uma contribuição e ela passa a valer XP", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-carto").click();
  await page.locator("#contribList button", { hasText: "Aprovar" }).first().click();
  await page.waitForTimeout(600);
  const contrib = await page.evaluate(() => window.__store["moderacao/estado"].contrib);
  expect(contrib["u_ana:r1"].ok).toBe(true);
});

test("quem teve contribuição aprovada ganha a conquista Primeiro traço", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-pass").click();
  await expect(page.locator("#sealsMap .stamp.got", { hasText: "Primeiro traço" })).toHaveCount(1);
});
