import { test, expect, abrirMapa, larguraVisao } from "./_base.mjs";


// pinça de verdade, pelo protocolo do navegador (dois dedos que se afastam)
async function pinca(page, ax, ay, bx, by, abrir){
  const cdp = await page.context().newCDPSession(page);
  const pts = (t) => [{x: ax - abrir*t, y: ay, id: 0}, {x: bx + abrir*t, y: by, id: 1}];
  await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: pts(0)});
  for (let i = 1; i <= 12; i++){ await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: pts(i/12)}); await page.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  await page.waitForTimeout(500);
}
const zoomDaPagina = page => page.evaluate(() => window.visualViewport ? visualViewport.scale : 1);

test("pinça no meio do mapa aproxima o mapa e nunca a página", async ({ page, isMobile }) => {
  test.skip(!isMobile, "pinça é de tela de toque");
  await abrirMapa(page);
  const w0 = await larguraVisao(page);
  await pinca(page, 170, 330, 230, 330, 80);
  expect(await zoomDaPagina(page)).toBe(1);
  expect(await larguraVisao(page)).toBeLessThan(w0 * 0.8);
});

test("pinça com um dedo sobre a barra do topo também aproxima o mapa, sem zoom da página", async ({ page, isMobile }) => {
  test.skip(!isMobile, "pinça é de tela de toque");
  await abrirMapa(page);
  const topo = await page.locator("#topbar").boundingBox();
  const w0 = await larguraVisao(page);
  const cdp = await page.context().newCDPSession(page);
  const y1 = topo.y + topo.height/2, y2 = topo.y + topo.height + 60;
  await cdp.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [{x: 200, y: y1, id: 0}, {x: 200, y: y2, id: 1}]});
  for (let i = 1; i <= 12; i++){ await cdp.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: 200, y: y1, id: 0}, {x: 200, y: y2 + i*15, id: 1}]}); await page.waitForTimeout(16); }
  await cdp.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  await page.waitForTimeout(500);
  expect(await zoomDaPagina(page)).toBe(1);
  expect(await larguraVisao(page)).toBeLessThan(w0 * 0.9);
});

test("a página não aceita zoom de pinça (só o mapa)", async ({ page }) => {
  await abrirMapa(page);
  const meta = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(meta).toMatch(/maximum-scale=1/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toMatch(/pan-x pan-y|none/);
});

test("no computador a rodinha do mouse aproxima e afasta o mapa no ponto do ponteiro", async ({ page, isMobile }) => {
  test.skip(isMobile, "rodinha é de computador");
  await abrirMapa(page);
  const st = await page.locator("#stage").boundingBox();
  const w0 = await larguraVisao(page);
  await page.mouse.move(st.x + st.width*0.4, st.y + st.height*0.5);
  for (let i = 0; i < 4; i++){ await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
  await page.waitForTimeout(400);
  const w1 = await larguraVisao(page);
  expect(w1).toBeLessThan(w0 * 0.7);
  // sobre o cartão do título (canto do mapa) a rodinha também move o zoom do mapa
  const tc = await page.locator(".title-card").boundingBox();
  await page.mouse.move(tc.x + 20, tc.y + 10);
  for (let i = 0; i < 4; i++){ await page.mouse.wheel(0, 120); await page.waitForTimeout(40); }
  await page.waitForTimeout(400);
  expect(await larguraVisao(page)).toBeGreaterThan(w1 * 1.4);
});
