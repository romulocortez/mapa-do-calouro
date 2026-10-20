// Base dos testes de navegador: bloqueia fontes externas (teste estável e offline) e falha se a página der erro de JavaScript.
import { test as base, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
export const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const erros = []; page.on("pageerror", e => erros.push(String(e)));
    // PAGINA=/beta/ roda os mesmos testes na versão beta (o padrão é o site principal, "/")
    const PAG = process.env.PAGINA || "/", ir = page.goto.bind(page);
    page.goto = (u, o) => ir(typeof u === "string" ? u.replace(/^(http:\/\/localhost:4173)?\/(?!\/)/, (m, h) => (h || "") + PAG) : u, o);
    await use(page);
    expect(erros, "a página não pode ter erros de JavaScript").toEqual([]);
  },
});
export { expect };
export async function abrirMapa(page, url = "/"){
  await page.goto(url);
  await page.locator("#openMap").click();
  // a partir da V34, depois do juramento vem a escolha do campus (Teresina abre nesta mesma página)
  const escolha = page.locator("#campusPick");
  if (await escolha.count() && await escolha.isVisible()) await page.locator('#campusList button[data-campus="teresina"]').click();
  await page.waitForTimeout(700);
}
export const larguraVisao = page => page.evaluate(() => +document.getElementById("map").getAttribute("viewBox").split(" ")[2]);
export async function buscar(page, termo, contem){
  await page.locator("#q").fill(termo);
  const r = page.locator("#results button", { hasText: contem || termo }).first();
  await r.click(); await page.waitForTimeout(900);
}
