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
