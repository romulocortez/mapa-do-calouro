import { test, expect, abrirMapa, FIXTURES } from "./_base.mjs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: FIXTURES + "mock-banco.js" });
  await page.addInitScript(() => { window.__store["pedidos/u_me"] = { itens: {} }; });   // sem pedido aberto
});
const meusPedidos = page => page.evaluate(() => Object.keys((window.__store["pedidos/u_me"] || {}).itens || {}).length);

test("a aba Ajuda avisa que as conversas não são um chat privado", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-ajuda").click();
  await expect(page.locator(".priv-note")).toContainText("não são um chat privado");
});

test("pedido com telefone pede confirmação antes de ser enviado", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-ajuda").click();
  await page.locator("#myReq textarea").fill("Não acho a sala 535, me chama no (86) 99999-8888");
  await page.locator("#myReq button", { hasText: "Pedir ajuda" }).click();
  await expect(page.locator("#toast")).toContainText("telefone");
  await page.waitForTimeout(300); expect(await meusPedidos(page)).toBe(0);
  await page.locator("#myReq button", { hasText: "Pedir ajuda" }).click();          // segundo toque: decidiu enviar
  await page.waitForTimeout(600); expect(await meusPedidos(page)).toBe(1);
});

test("CPF nunca é enviado", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-ajuda").click();
  await page.locator("#myReq textarea").fill("Preciso de ajuda com a matrícula, meu CPF é 123.456.789-09");
  for (let i = 0; i < 2; i++){ await page.locator("#myReq button", { hasText: "Pedir ajuda" }).click(); await page.waitForTimeout(300); }
  await expect(page.locator("#toast")).toContainText("CPF");
  expect(await meusPedidos(page)).toBe(0);
});
