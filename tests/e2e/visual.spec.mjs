import { test, expect, abrirMapa, buscar } from "./_base.mjs";


test("a aba de melhorias do mapa se chama Contribua", async ({ page }) => {
  await abrirMapa(page);
  await expect(page.locator("#tab-report")).toHaveText("Contribua");
});

test("a letra manuscrita não usa a IM Fell (o J dela parece F: 'Furo solenemente')", async ({ page }) => {
  await page.goto("/");
  const fam = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--hand"));
  expect(fam).not.toMatch(/IM Fell English"?,/);
  expect(fam).toMatch(/Cormorant Garamond/);
  expect(await page.locator("#openMap").evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/Cormorant Garamond/);
});

test("o nome das pessoas aparece sobre o pergaminho desenhado (imagem)", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click(); await page.locator("#demoBtn").click();
  await page.waitForTimeout(1200);
  for (let i = 0; i < 3; i++){ await page.evaluate(() => document.getElementById("zin").click()); await page.waitForTimeout(250); }
  await expect.poll(() => page.locator("#people .pp use.scroll-img, #people .pp image").count()).toBeGreaterThan(0);
});

test("o mapa é desenhado com folga de 50% de cada lado da tela", async ({ page }) => {
  await abrirMapa(page);
  const [cv, st] = await Promise.all([page.locator("#baseCv").boundingBox(), page.locator("#stage").boundingBox()]);
  expect(cv.width).toBeGreaterThanOrEqual(st.width * 1.99);
  expect(cv.height).toBeGreaterThanOrEqual(st.height * 1.99);
  expect(cv.x).toBeLessThanOrEqual(st.x - st.width * 0.49);
});
