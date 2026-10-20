import { test, expect, abrirMapa, buscar } from "./_base.mjs";

test("buscar a sala 535 leva ao 1º andar do Bloco 03", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "535", "Sala 535");
  await expect(page.locator("#placeCard")).toContainText("Sala 535");
  await expect(page.locator("#placeCard")).toContainText("1º andar");
  await expect(page.locator("#flName")).toHaveText("Bloco 03");
  await expect(page.locator("#flBtns button.on")).toHaveText("1");
});

test("as salas 616 e 617 ficam dentro do NES, no térreo do Bloco 06", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "616", "Sala 616");
  await expect(page.locator("#placeCard")).toContainText("Térreo");
  await expect(page.locator("#placeCard")).toContainText("NES");
});

test("o seletor de andar troca o que aparece no prédio", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "535", "Sala 535");
  await page.locator("#flBtns button", { hasText: "T" }).click();
  await expect(page.locator("#flBtns button.on")).toHaveText("T");
  await expect(page.locator("#indoorG .in-t", { hasText: "GEAPI" })).toHaveCount(1);
});
