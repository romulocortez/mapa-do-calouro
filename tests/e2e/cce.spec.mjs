import { test, expect, abrirMapa, buscar } from "./_base.mjs";

// Salas do CCE pelo mapeamento de 2025, posicionadas pela planta baixa geral do campus (DWG). Só na beta por enquanto.
test.skip(process.env.PAGINA !== "/beta/", "CCE detalhado ainda só na versão beta");

test("buscar a sala 438 do CCE mostra a capacidade e a planta do prédio", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "438", "Sala 438");
  await expect(page.locator("#placeCard")).toContainText("CCE");
  await expect(page.locator("#placeCard")).toContainText("40 lugares");
  await expect(page.locator("#flName")).toHaveText("CCE");
  await expect(page.locator("#indoorG image.in-plan")).toHaveCount(1);
});

test("as 30 salas numeradas e o auditório do CCE estão no mapa", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "450", "Sala 450 A/B");
  await expect(page.locator("#placeCard")).toContainText("30 lugares");
  const n = await page.evaluate(() => [...document.querySelectorAll("#indoorG .in-b.focus .in-t")].map(t => t.textContent));
  for (const s of ["01", "02", "03", "04", "422", "433", "447", "459", "476", "477", "Auditório"]) expect(n).toContain(s);
  expect(n.length).toBe(31);
});
