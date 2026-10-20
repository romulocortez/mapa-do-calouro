import { test, expect, buscar } from "./_base.mjs";

// Escolha do campus depois do juramento e o mapa de Picos (prévia). Só na beta até ela ser promovida.
test.skip(process.env.PAGINA !== "/beta/", "escolha de campus ainda só na versão beta");

test("depois do juramento aparece a escolha entre os 4 campi; Bom Jesus e Floriano ainda não abrem", async ({ page }) => {
  await page.goto("/");
  await page.locator("#openMap").click();
  const lista = page.locator("#campusList button");
  await expect(lista).toHaveCount(4);
  await expect(lista).toHaveText([/Teresina/, /Picos/, /Bom Jesus/, /Floriano/]);
  await expect(page.locator('#campusList button[data-campus="bomjesus"]')).toBeDisabled();
  await expect(page.locator('#campusList button[data-campus="floriano"]')).toBeDisabled();
  await page.locator('#campusList button[data-campus="teresina"]').click();
  await expect(page.locator("#campusPick")).toBeHidden();
  await expect(page.locator("html")).toHaveClass(/map-open/);
});

test("escolher Picos abre o mapa de Picos já aberto, com as salas do croqui", async ({ page }) => {
  await page.goto("/");
  await page.locator("#openMap").click();
  await page.locator('#campusList button[data-campus="picos"]').click();
  await page.waitForURL(/picos\/\?abrir=1/);
  await expect(page.locator("html")).toHaveClass(/map-open/);
  await expect(page.locator("#trocaCampusNome")).toHaveText("Picos");
  await buscar(page, "801", "Sala 801");
  await expect(page.locator("#placeCard")).toContainText("Térreo");
  await expect(page.locator("#flName")).toHaveText("Salas 801–808");
  await buscar(page, "845", "Sala 845");
  await expect(page.locator("#placeCard")).toContainText("1º andar");
  await expect(page.locator("#flName")).toHaveText("Bloco de Nutrição");
});

test("em Picos o GPS avisa que ainda não foi calibrado (não mostra posição errada)", async ({ page }) => {
  await page.goto("/picos/?abrir=1");
  await page.locator("#tab-eu").click();
  await page.locator("#gpsStart").click();
  await expect(page.locator(".gps-status").first()).toContainText("ainda não foi calibrada");
});

test("trocar de campus volta para a escolha e lembra o último campus", async ({ page }) => {
  await page.goto("/picos/?abrir=1");
  await page.locator("#tab-lugares").click();
  await page.locator("#trocaCampus").click();
  await expect(page.locator("#campusPick")).toBeVisible();
  await expect(page.locator('#campusList button[data-campus="picos"]')).toHaveClass(/ultimo/);
  await page.locator('#campusList button[data-campus="teresina"]').click();
  await page.waitForURL(url => !/picos/.test(url.pathname));
  await expect(page.locator("#trocaCampusNome")).toHaveText("Teresina");
});
