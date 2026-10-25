// Regressão: quando várias pessoas andam juntas, o ID (pergaminho com o nome) de uma cobria quem estava atrás.
// Agora os IDs de quem está perto ficam empilhados acima das cabeças: nenhum ID cobre o corpo de outra pessoa
// nem outro ID. Pessoas e nomes inventados.
import { test, expect, abrirMapa } from "./_base.mjs";
test.skip(process.env.PAGINA !== "/beta/", "IDs empilhados ainda só na versão beta (V37)");

const GRUPO = `(function(){
  const nomes = ["Ana Teste", "Beto Exemplo", "Cris Fictícia", "Duda Inventada", "Enzo Modelo"];
  const peers = [{peer:"eu", by:"u_eu", isMe:true, sameTab:true, kind:"viewer", presence:{}}];
  nomes.forEach((n, i) => peers.push({peer:"p"+i, by:"u"+i, isMe:false, kind:"viewer",
    presence:{on:true, n, r: i % 2 ? "v" : "c", cu:"Curso", m:"", h:false, x: 1500 + (i - 2)*5, y: 800 + (i % 3)*4}}));
  window.claude = { use: async (n) => {
    if (n === "user") return { me: async () => ({name:"Teste", id:"u_eu"}), id: async () => "u_eu", profiles: async () => ({}),
      canEdit: async () => false, isOwner: async () => false, can: async () => false };
    if (n === "room") return { presence: async () => {}, onConnection: f => { setTimeout(() => f(true), 10); return () => {}; },
      onPeers: f => { setTimeout(() => f({peers}), 50); return () => {}; } };
    return null; } };
})();`;

const sobrepoe = (a, b, folga = 0) => a.x < b.x + b.width - folga && b.x < a.x + a.width - folga && a.y < b.y + b.height - folga && b.y < a.y + a.height - folga;

test("IDs de pessoas juntas ficam empilhados e não escondem ninguém", async ({ page }) => {
  await page.addInitScript(GRUPO);
  await abrirMapa(page);
  for (let i = 0; i < 6; i++){ await page.evaluate(() => document.getElementById("zin").click()); await page.waitForTimeout(200); }
  await page.locator("#tab-gente").click();
  await page.locator("#peopleList li button", { hasText: "Cris Fictícia" }).click();
  await page.waitForTimeout(1200);
  if (process.env.FOTO) await page.screenshot({ path: process.env.FOTO });
  const pessoas = await page.evaluate(() => [...document.querySelectorAll("#people .pp")].map(g => {
    const r = o => { const b = o.getBoundingClientRect(); return {x:b.x, y:b.y, width:b.width, height:b.height}; };
    // a imagem do meio do pergaminho tem bordas transparentes: a parte desenhada vai de 62/728 a 418/728 da altura
    const meio = r(g.querySelector('use[href="#scrM"]'));
    const id = {x: meio.x, width: meio.width, y: meio.y + meio.height*62/728, height: meio.height*(418 - 62)/728};
    return { nome: g.querySelector(".bn-t").textContent, corpo: r(g.querySelector(".hit")), id };
  }));
  expect(pessoas.length, "as 5 pessoas aparecem separadas, não num balão").toBe(5);
  for (const a of pessoas) for (const b of pessoas){
    if (a === b) continue;
    expect(sobrepoe(a.id, b.corpo), `o ID de ${a.nome} cobre ${b.nome}`).toBe(false);
    expect(sobrepoe(a.id, b.id, 2), `os IDs de ${a.nome} e ${b.nome} se sobrepõem`).toBe(false);
  }
});
