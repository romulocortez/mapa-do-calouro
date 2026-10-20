import { test, expect, abrirMapa, larguraVisao } from "./_base.mjs";

// Os toques são disparados dentro da própria página, com intervalos controlados (80 ms entre toques),
// para o teste não depender da velocidade da máquina que roda os testes.
async function tocar(page, n){
  await page.evaluate(async n => {
    const svg = document.getElementById("map"), espera = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < n; i++){
      const o = { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 200, clientY: 330, bubbles: true };
      svg.dispatchEvent(new PointerEvent("pointerdown", o)); await espera(40);
      svg.dispatchEvent(new PointerEvent("pointerup", o)); await espera(80);
    }
  }, n);
}

test("dois toques aproximam e três toques afastam", async ({ page, isMobile }) => {
  test.skip(!isMobile, "gesto de toque é do celular");
  await abrirMapa(page);
  const w0 = await larguraVisao(page);
  await tocar(page, 1); await page.waitForTimeout(800); expect(await larguraVisao(page)).toBeCloseTo(w0, 0);
  await tocar(page, 2); await expect.poll(() => larguraVisao(page), { timeout: 4000 }).toBeCloseTo(w0 / 2, 0);
  await page.waitForTimeout(500);
  await tocar(page, 3); await expect.poll(() => larguraVisao(page), { timeout: 4000 }).toBeCloseTo(w0, 0);
});

test("os botões + e − mudam o zoom", async ({ page }) => {
  await abrirMapa(page);
  const w0 = await larguraVisao(page);
  await page.locator("#zin").click();
  await expect.poll(() => larguraVisao(page), { timeout: 4000 }).toBeLessThan(w0);
  await page.locator("#zout").click();
  await expect.poll(() => larguraVisao(page), { timeout: 4000 }).toBeCloseTo(w0, 0);
});

test("o mapa nunca rola por dentro (os botões de zoom ficam no lugar depois de usados)", async ({ page, isMobile }) => {
  await abrirMapa(page);
  const antes = await page.locator(".ctrls").boundingBox();
  // com a aba de baixo aberta, o botão fica coberto; foco ou "rolar até o elemento" não podem deslocar o mapa
  await page.locator("#tab-gente").click(); await page.waitForTimeout(300);
  // é o que o navegador faz ao rolar até um botão coberto pela aba (aconteceu ao tocar no zoom com a aba aberta)
  await page.evaluate(() => { document.getElementById("stage").scrollTo(195, 420); });
  await page.waitForTimeout(100);
  for (let i = 0; i < 2; i++){ await page.evaluate(() => document.getElementById("zin").click()); await page.waitForTimeout(300); }
  if (isMobile){ await page.locator(".grab").click(); await page.waitForTimeout(400); }
  const rolagem = await page.evaluate(() => { const s = document.getElementById("stage"); return [s.scrollLeft, s.scrollTop]; });
  expect(rolagem).toEqual([0, 0]);
  const depois = await page.locator(".ctrls").boundingBox();
  expect(Math.abs(depois.x - antes.x)).toBeLessThan(1);
});
