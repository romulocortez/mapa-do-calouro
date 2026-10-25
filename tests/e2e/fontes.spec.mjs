// LGPD: ao abrir o mapa, o navegador só fala com o próprio site (nada de IP de visitante indo para terceiros),
// e as fontes do mapa carregam dos arquivos em fonts/.
import { test, expect, abrirMapa } from "./_base.mjs";

for (const url of ["/", "/picos/"]){
  test(`${url}: abrir o mapa não faz pedido a outros servidores e as fontes carregam`, async ({ page }) => {
    const fora = [];
    page.on("request", r => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fora.push(r.url()); });
    await abrirMapa(page, url);
    const ok = await page.evaluate(async () => {
      await document.fonts.ready;
      const q = ['600 italic 16px "Cormorant Garamond"', '16px "IM Fell English SC"', '16px "Crimson Pro"', '16px "Henny Penny"'];
      await Promise.all(q.map(f => document.fonts.load(f)));
      return q.filter(f => !document.fonts.check(f));
    });
    expect(ok, "fontes que não carregaram").toEqual([]);
    expect(fora, "pedidos a outros servidores").toEqual([]);
  });
}
