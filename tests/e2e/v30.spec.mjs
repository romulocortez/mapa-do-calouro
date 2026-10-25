import { test, expect, abrirMapa, buscar } from "./_base.mjs";


const larguraID = page => page.evaluate(() => { const g = document.querySelector("#people .pp.sel:not(.empilhado) .bn"); return g ? g.getBoundingClientRect().width : 0; });
const kAtual = page => page.evaluate(() => +document.getElementById("map").getAttribute("viewBox").split(" ")[2] / document.getElementById("stage").getBoundingClientRect().width);
const tamanhoID = k => Math.min(2.4, Math.max(0.5, 0.8 / k));   // regra de tamanho (metros por pixel → escala)

test("o pergaminho com o nome (ID) cresce com o zoom e encolhe ao afastar, como o nome das salas", async ({ page }) => {
  await abrirMapa(page);
  await page.locator("#tab-gente").click(); await page.locator("#demoBtn").click();
  await page.waitForTimeout(1500);
  // escolhe alguém que esteja sozinho: quem está em grupo vira balão e, de perto, entra numa pilha de IDs
  // (V37), onde o ID tem tamanho fixo
  const zoom = async (id, n) => { for (let i = 0; i < n; i++){ await page.evaluate(b => document.getElementById(b).click(), id); await page.waitForTimeout(350); } await page.waitForTimeout(700); };
  let meio = 0, perto = 0, k1 = 0, k2 = 0;
  for (let i = 0; i < 20 && !perto; i++){
    await page.locator("#peopleList li button").nth(i).click(); await page.waitForTimeout(800);
    meio = await larguraID(page); if (!meio) continue;
    k1 = await kAtual(page);
    await zoom("zin", 3);
    perto = await larguraID(page); k2 = await kAtual(page);
    if (!perto) await zoom("zout", 3);
  }
  expect(meio).toBeGreaterThan(0);
  const esperado = tamanhoID(k2) / tamanhoID(k1);
  expect(esperado).toBeGreaterThan(1.15);                       // o zoom mudou o bastante para o ID crescer
  expect(perto / meio).toBeGreaterThan(esperado * 0.85);
  expect(perto / meio).toBeLessThan(esperado * 1.15);
});

test("a legenda 'N pessoas' dos grupos tem contraste com o fundo, no claro e no escuro", async ({ page }) => {
  for (const tema of ["light", "dark"]){
    await page.emulateMedia({ colorScheme: tema });
    await abrirMapa(page);
    await page.locator("#tab-gente").click(); await page.locator("#demoBtn").click();
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const c = document.querySelector("#clusters .cluster-pin .cap"); if (!c) return null;
      const cs = getComputedStyle(c), papel = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
      const rgb = s => { const m = s.match(/\d+(\.\d+)?/g); if (s.startsWith("#")) return [1,3,5].map(i => parseInt(s.slice(i, i+2), 16)); return m.slice(0,3).map(Number); };
      const lum = ([r,g,b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : ((v + 0.055)/1.055) ** 2.4; }; return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b); };
      const a = lum(rgb(cs.fill)), b = lum(rgb(papel));
      return {contraste: (Math.max(a, b) + 0.05)/(Math.min(a, b) + 0.05), ordem: cs.paintOrder};
    });
    expect(r, "precisa haver um grupo no exemplo").not.toBeNull();
    expect(r.contraste, `contraste no tema ${tema}`).toBeGreaterThan(4.5);
    expect(r.ordem).toMatch(/stroke/);   // contorno de papel por trás da letra
  }
});

test("Anexo CCE/CCHL: 471 a 475 e 356 no térreo, 357 a 362 no 1º andar", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "471", "Sala 471");
  await expect(page.locator("#placeCard")).toContainText("Térreo");
  await expect(page.locator("#flName")).toHaveText("Anexo CCE/CCHL");
  await expect(page.locator("#flBtns button.on")).toHaveText("T");
  await buscar(page, "357", "Sala 357");
  await expect(page.locator("#placeCard")).toContainText("1º andar");
  await expect(page.locator("#flBtns button.on")).toHaveText("1");
});
