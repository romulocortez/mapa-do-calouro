import { test, expect, abrirMapa } from "./_base.mjs";

test("o exemplo mostra 20 pessoas andando e grupos viram balões quando o mapa está afastado", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click();
  await page.locator("#demoBtn").click();
  await page.waitForTimeout(2500);
  await expect(page.locator("#peopleList li")).toHaveCount(20);
  expect(await page.locator("#clusters .cluster-pin").count()).toBeGreaterThan(0);
  const pos1 = await page.locator("#peopleList li").count();
  expect(pos1).toBe(20);
});

test("as pessoas do exemplo andam sobre os caminhos (não ficam paradas)", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click();
  await page.locator("#demoBtn").click();
  for (let i = 0; i < 4; i++){ await page.locator("#zin").click(); await page.waitForTimeout(250); }
  const marcadores = () => page.evaluate(() => [...document.querySelectorAll("#people .pp")].map(g => g.getAttribute("transform")).join("|"));
  await page.waitForTimeout(1200); const a = await marcadores();
  await page.waitForTimeout(2000); const b = await marcadores();
  expect(a).not.toBe(b);
});
