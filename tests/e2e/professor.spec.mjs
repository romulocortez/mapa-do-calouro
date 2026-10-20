import { test, expect, abrirMapa } from "./_base.mjs";

// Easter egg do exemplo: um professor de Engenharia Mecânica que vai e volta entre a sala dos professores
// do Bloco 02 e o LAMEC (Centro Integrado IV). Pela regra 15 do projeto, o teste não escreve o nome real:
// ele procura o professor pelo papel ("PROFESSOR").


// toca no professor na lista (centraliza nele) e aproxima, para ele não virar parte de um balão de grupo
async function verProfessor(page){
  await page.locator("#peopleList li", { hasText: "PROFESSOR" }).locator("button").first().click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 2; i++){ await page.evaluate(() => document.getElementById("zin").click()); await page.waitForTimeout(350); }
  await page.waitForTimeout(600);
}

test("o exemplo tem um professor sem '(exemplo)' no nome e com botas amarelas", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click(); await page.locator("#demoBtn").click();
  await page.waitForTimeout(1200);
  const item = page.locator("#peopleList li", { hasText: "PROFESSOR" });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Engenharia Mecânica");
  await expect(item).not.toContainText("(exemplo)");
  // as demais pessoas de exemplo continuam marcadas como exemplo
  await expect(page.locator("#peopleList li", { hasText: "(exemplo)" })).toHaveCount(20);
  await verProfessor(page);
  const pe = await page.evaluate(() => {
    const g = document.querySelector("#people .pp.professor"); if (!g) return null;
    const f = g.querySelector(".foot"), m = getComputedStyle(f).fill.match(/\d+/g).map(Number);
    return {rgb: m, nome: g.querySelector(".bn-t").textContent};
  });
  expect(pe, "o professor aparece no mapa").not.toBeNull();
  expect(pe.nome).not.toContain("exemplo");
  const [r, g, b] = pe.rgb;
  expect(r).toBeGreaterThan(200); expect(g).toBeGreaterThan(150); expect(b).toBeLessThan(90);   // amarelo
});

test("o professor anda entre a sala dos professores do Bloco 02 e o LAMEC, pelo caminho", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click(); await page.locator("#demoBtn").click();
  await page.waitForTimeout(800); await verProfessor(page);
  const pos = () => page.evaluate(() => {
    const t = document.querySelector("#people .pp.professor")?.getAttribute("transform") || "";
    const m = t.match(/translate\(([-\d.]+) ([-\d.]+)\)/); return m ? [+m[1], +m[2]] : null;
  });
  // zona entre os dois prédios do CT (Bloco 02 e Centro Integrado IV), em metros do mapa
  const naZona = p => p && p[0] > 960 && p[0] < 1140 && p[1] > 600 && p[1] < 730;
  const vistos = [];
  for (let i = 0; i < 6; i++){ await page.waitForTimeout(800); vistos.push(await pos()); }
  for (const p of vistos) expect(naZona(p), `posição ${p}`).toBe(true);
  expect(new Set(vistos.map(p => p.join())).size, "ele se movimenta").toBeGreaterThan(1);
});

test("o professor já está no mapa sem tocar em 'Ver um exemplo' e não conta como pessoa online", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click();
  await expect(page.locator("#peopleList li", { hasText: "PROFESSOR" })).toHaveCount(1);
  await expect(page.locator("#peopleList li", { hasText: "(exemplo)" })).toHaveCount(0);
  await expect(page.locator("#peopleCount")).toHaveText("");
  // ligar e desligar o exemplo não duplica nem tira o professor
  await page.locator("#demoBtn").click(); await page.waitForTimeout(800);
  await expect(page.locator("#peopleList li", { hasText: "PROFESSOR" })).toHaveCount(1);
  await page.locator("#demoBtn").click(); await page.waitForTimeout(800);
  await expect(page.locator("#peopleList li", { hasText: "PROFESSOR" })).toHaveCount(1);
});

