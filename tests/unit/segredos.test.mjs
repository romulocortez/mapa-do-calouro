// Nada de chave secreta nem dado pessoal real no repositório público.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { R, RAIZ, HTML } from "./_regras.mjs";

function arquivos(dir, out = []){
  for (const n of readdirSync(dir)){
    if (["node_modules", ".git", "test-results", "playwright-report"].includes(n)) continue;
    const p = join(dir, n); const s = statSync(p);
    if (s.isDirectory()) arquivos(p, out); else if (/\.(html|js|mjs|json|md|yml|yaml|txt|css)$/.test(n)) out.push(p);
  }
  return out;
}
const SEGREDOS = [
  [/eyJ[\w-]{20,}\.[\w-]{20,}\.[\w-]{10,}/, "token JWT (chave do Supabase?)"],
  [/service_role\w*["']?\s*[:=]\s*["'`][^"'`\s]{20,}/i, "chave service_role do Supabase atribuída no código"],
  [/\bsk-[A-Za-z0-9]{20,}/, "chave de API"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "chave privada"],
  [/SUPABASE_SERVICE/i, "variável de chave secreta"],
];

test("nenhum arquivo do repositório tem chave secreta", () => {
  for (const f of arquivos(RAIZ)){
    if (f.endsWith("segredos.test.mjs")) continue;
    const s = readFileSync(f, "utf8");
    for (const [re, o_que] of SEGREDOS) assert.ok(!re.test(s), `${o_que} em ${f.replace(RAIZ, "")}`);
  }
});

test("o mapa publicado não carrega e-mail, telefone ou CPF de ninguém", () => {
  const texto = HTML.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, "");   // ignora imagens embutidas
  const achados = R.dadosPessoaisNoTexto(texto);
  assert.deepEqual(achados, [], "achou: " + achados.join(", "));
});
