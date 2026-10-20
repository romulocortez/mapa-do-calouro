import { test, expect, abrirMapa } from "./_base.mjs";

test("o exemplo mostra 20 pessoas andando e grupos viram balões quando o mapa está afastado", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click();
  await page.locator("#demoBtn").click();
  await page.waitForTimeout(2500);
  // 20 pessoas marcadas como exemplo (o professor do easter egg não leva a marca)
  await expect(page.locator("#peopleList li", { hasText: "(exemplo)" })).toHaveCount(20);
  expect(await page.locator("#clusters .cluster-pin").count()).toBeGreaterThan(0);
});

test("as pessoas do exemplo andam sobre os caminhos (não ficam paradas)", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click();
  await page.locator("#demoBtn").click();
  for (let i = 0; i < 4; i++){ await page.evaluate(() => document.getElementById("zin").click()); await page.waitForTimeout(250); }
  const marcadores = () => page.evaluate(() => [...document.querySelectorAll("#people .pp")].map(g => g.getAttribute("transform")).join("|"));
  await page.waitForTimeout(1200); const a = await marcadores();
  await page.waitForTimeout(2000); const b = await marcadores();
  expect(a).not.toBe(b);
});

test("pessoa tocada fica no centro da parte visível do mapa, acima da aba de baixo", async ({ page, isMobile }) => {
  test.skip(!isMobile, "a aba de baixo só cobre o mapa no celular");
  await abrirMapa(page);
  await page.locator("#tab-gente").click(); await page.locator("#demoBtn").click();
  await page.waitForTimeout(1500);
  await page.locator("#peopleList li button").nth(3).click();
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const p = document.querySelector("#people .pp.sel .dot") || document.querySelector("#people .pp.sel");
    const b = p.getBoundingClientRect(), panel = document.querySelector(".panel").getBoundingClientRect();
    const topo = document.getElementById("topbar").getBoundingClientRect();
    return {y: b.top + b.height/2, x: b.left + b.width/2, topo: topo.bottom, fundo: panel.top, w: innerWidth};
  });
  expect(r.y).toBeGreaterThan(r.topo);
  expect(r.y).toBeLessThan(r.fundo);
  expect(Math.abs(r.y - (r.topo + r.fundo)/2)).toBeLessThan(40);
  expect(Math.abs(r.x - r.w/2)).toBeLessThan(40);
});
