import { test, expect, abrirMapa, buscar } from "./_base.mjs";

// O fundo fixo (terreno, mata, ruas, prédios) é pintado num <canvas> para os gestos ficarem leves.
// Estes testes garantem que ele aparece, fica alinhado com o SVG e que dá para voltar ao SVG com ?svg=1.
// Por enquanto isso existe só na versão beta (/beta/). Ao promover a beta para o site principal, apague a linha abaixo.
test.skip(process.env.PAGINA !== "/beta/", "fundo em canvas ainda só na versão beta");

async function pixelNoPredio(page){
  return page.evaluate(() => {
    const cv = document.getElementById("baseCv"), st = document.getElementById("stage").getBoundingClientRect();
    // centro de um prédio grande e visível na tela
    const blds = [...document.querySelectorAll("#bldG path.bld")].map(p => p.getBoundingClientRect())
      .filter(r => r.width > 25 && r.height > 25 && r.left > st.left && r.right < st.right && r.top > st.top && r.bottom < st.top + st.height*0.5);
    if (!blds.length) return null;
    const r = blds[0], c = cv.getBoundingClientRect(), sx = cv.width / c.width;
    const x = Math.round((r.left + r.width/2 - c.left) * sx), y = Math.round((r.top + r.height/2 - c.top) * sx);
    return [...cv.getContext("2d").getImageData(x, y, 1, 1).data];
  });
}

test("o fundo é desenhado no canvas, alinhado com os prédios do SVG", async ({ page }) => {
  await abrirMapa(page);
  await buscar(page, "535", "Sala 535");
  await expect(page.locator("#world")).toHaveClass(/\bcv\b/);
  const px = await pixelNoPredio(page);
  expect(px, "um prédio grande deve estar na tela").not.toBeNull();
  expect(px[3], "o canvas tem tinta onde o SVG diz que há um prédio").toBeGreaterThan(200);
  // os prédios originais ficam invisíveis (não são pintados duas vezes)
  expect(await page.locator("#bldG path.bld").first().evaluate(e => getComputedStyle(e).visibility)).toBe("hidden");
});

test("com ?svg=1 o fundo volta a ser o SVG (para comparar no aparelho)", async ({ page }) => {
  await abrirMapa(page, "/?svg=1");
  await page.waitForTimeout(3500);   // no computador a animação a tinta termina em 3,2 s
  await expect(page.locator("#world")).not.toHaveClass(/\bcv\b/);
  expect(await page.locator("#bldG path.bld").first().evaluate(e => getComputedStyle(e).visibility)).toBe("visible");
});

test("pegadas e pulsos piscam em degraus, sem repintar o mapa 60 vezes por segundo", async ({ page }) => {
  await abrirMapa(page);
  // cria elementos com as mesmas classes usadas pelas pegadas, pelo pulso de ajuda e pelo GPS e lê o CSS aplicado
  const tempos = await page.evaluate(() => {
    const NS = "http://www.w3.org/2000/svg", w = document.getElementById("world"), g = document.createElementNS(NS, "g");
    g.innerHTML = '<g class="steps"><circle class="step"/></g><g class="pp help"><circle class="ring"/></g><circle class="gps-halo"/><circle class="gps-foot f1"/>';
    w.appendChild(g);
    const r = [...g.querySelectorAll(".step,.ring,.gps-halo,.gps-foot")].map(e => getComputedStyle(e).animationTimingFunction);
    g.remove(); return r;
  });
  expect(tempos).toHaveLength(4);
  for (const t of tempos) expect(t).toMatch(/^steps\(/);
});
