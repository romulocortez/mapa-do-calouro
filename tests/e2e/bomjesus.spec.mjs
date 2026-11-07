// Campus de Bom Jesus (V38, beta): mapa do OpenStreetMap, blocos BL-101 a BL-106, GPS com coordenadas reais
// e o easter egg do convidado especial (Whindersson Nunes, com autorização registrada no checklist).
import { test, expect, buscar } from "./_base.mjs";
test.skip(process.env.PAGINA !== "/beta/", "Bom Jesus ainda só na versão beta (V38)");

test("escolher Bom Jesus abre o mapa do campus e acha os blocos pela busca", async ({ page }) => {
  await page.goto("/");
  await page.locator("#openMap").click();
  await expect(page.locator('#campusList button[data-campus="bomjesus"]')).toBeEnabled();
  await page.locator('#campusList button[data-campus="bomjesus"]').click();
  await page.waitForURL(/bomjesus\/\?abrir=1/);
  await expect(page.locator("html")).toHaveClass(/map-open/);
  await expect(page.locator("#trocaCampusNome")).toHaveText("Bom Jesus");
  await buscar(page, "BL-103", "BL-103");
  await expect(page.locator("#placeCard")).toContainText("Administração");
  await buscar(page, "HVU", "HVU");
  await expect(page.locator("#placeCard")).toContainText("Hospital Veterinário");
});

test("o convidado especial anda pelo campus, todo dourado, sem precisar do exemplo", async ({ page }) => {
  await page.goto("/bomjesus/?abrir=1");
  const g = page.locator("#people .pp.convidado");
  await expect(g).toHaveCount(1);
  await expect(g.locator(".bn-t")).toHaveText("Whindersson Nunes");
  await expect(g.locator(".rib-r")).toContainText("CONVIDADO ESPECIAL");
  const cor = await g.locator(".foot").first().evaluate(e => getComputedStyle(e).fill);
  expect(cor).toBe("rgb(212, 166, 42)");
  const pos = () => g.getAttribute("transform");
  const a = await pos(); await page.waitForTimeout(4000); const b = await pos();
  expect(b, "ele se move").not.toBe(a);
});

test("o convidado não aparece em Teresina nem em Picos", async ({ page }) => {
  for (const u of ["/?abrir=1", "/picos/?abrir=1"]){
    await page.goto(u); await page.waitForTimeout(1500);
    await expect(page.locator("#people .pp.convidado")).toHaveCount(0);
  }
});

test.describe("GPS", () => {
  // coordenadas do centro do Restaurante Universitário no OpenStreetMap
  test.use({ geolocation: { latitude: -9.084339425, longitude: -44.327948475, accuracy: 5 }, permissions: ["geolocation"] });
  test("em Bom Jesus o GPS funciona e põe a pessoa no lugar certo (no RU)", async ({ page }) => {
    await page.goto("/bomjesus/?abrir=1");
    await page.locator("#tab-eu").click();
    await page.locator("#gpsStart").click();
    await expect(page.locator("#gpsStatus")).not.toContainText("não foi calibrada");
    await expect.poll(async () => page.locator(".gps-mark").getAttribute("transform"), { timeout: 10000 }).toMatch(/translate/);
    const t = await page.locator(".gps-mark").getAttribute("transform");
    const [x, y] = t.match(/translate\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number);
    // RU no mapa: (497.7, 720.1) em metros; aceita até 3 m de diferença
    expect(Math.hypot(x - 497.7, y - 720.1)).toBeLessThan(3);
  });
});
