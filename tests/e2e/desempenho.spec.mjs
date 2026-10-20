import { test, expect, abrirMapa, FIXTURES } from "./_base.mjs";

test("com 1000 pessoas online o mapa continua fluido e só desenha quem está na tela", async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-multidao.js" });
  await abrirMapa(page, "/?n=1000");
  await page.waitForTimeout(2000);
  const quadros = await page.evaluate(() => new Promise(ok => { let n = 0; const t0 = performance.now();
    (function f(t){ n++; if (t - t0 < 2000) requestAnimationFrame(f); else ok(n / 2); })(t0); }));
  expect(quadros).toBeGreaterThan(20);                       // quadros por segundo
  const desenhados = await page.locator("#people .pp, #clusters .cluster-pin").count();
  expect(desenhados).toBeLessThan(300);
});
