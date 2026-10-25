// LGPD: abrir o mapa não pode mandar o endereço IP de quem visita (muitos são menores de idade)
// para serviços de terceiros. Fontes, imagens e scripts vêm do próprio site.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { RAIZ } from "./_regras.mjs";

const PAGINAS = ["index.html", "picos/index.html", "beta/index.html", "beta/picos/index.html"]
  .filter(p => existsSync(join(RAIZ, p)));

// endereços externos em atributos e CSS que o navegador busca sozinho ao abrir a página
const EXTERNO = /(?:<link[^>]+href|<script[^>]+src|<img[^>]+src|<iframe[^>]+src|@import|url\()\s*=?\s*["']?(https?:)?\/\/[^"')\s>]+/gi;

for (const pagina of PAGINAS){
  const html = readFileSync(join(RAIZ, pagina), "utf8").replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, "");

  test(`${pagina}: não carrega nada de servidores de terceiros ao abrir`, () => {
    const achados = html.match(EXTERNO) || [];
    assert.deepEqual(achados, [], "carrega de fora: " + achados.join(" | "));
    assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html), "ainda usa o Google Fonts");
  });

  test(`${pagina}: as fontes declaradas existem no site`, () => {
    const fontes = [...html.matchAll(/url\("([^"]+\.woff2)"\)/g)].map(m => m[1]);
    assert.ok(fontes.length >= 4, "esperava as fontes do mapa em @font-face");
    for (const f of fontes) assert.ok(existsSync(join(RAIZ, dirname(pagina), f)), `falta o arquivo ${f} para ${pagina}`);
  });
}
