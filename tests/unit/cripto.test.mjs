// Conversas cifradas: confere o bloco <cripto> do index.html (o mesmo código que vai para o ar).
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { HTML } from "./_regras.mjs";

const ini = HTML.indexOf("/* <cripto>"), fim = HTML.indexOf("/* </cripto> */");
const temBloco = ini >= 0 && fim > ini;
const CRIPTO = temBloco ? vm.runInThisContext("(function(){\n" + HTML.slice(ini, fim) + "\nreturn CRIPTO;\n})")() : null;
const t = temBloco ? test : test.skip;   // o site principal ainda não tem o bloco (só a beta)

t("os dois lados de uma conversa chegam à mesma chave e leem a mensagem", async () => {
  const ana = await CRIPTO.novaChave(), hugo = await CRIPTO.novaChave();
  const kA = await CRIPTO.chaveConversa(ana.privada, hugo.publica, "pedido-1");
  const kH = await CRIPTO.chaveConversa(hugo.privada, ana.publica, "pedido-1");
  const m = await CRIPTO.cifrar(kA, "Estou na frente do Bloco 05, de camisa azul.");
  assert.equal(await CRIPTO.decifrar(kH, m), "Estou na frente do Bloco 05, de camisa azul.");
});

t("o banco só vê texto cifrado: nada do texto aparece, e o mesmo texto cifra diferente a cada vez", async () => {
  const a = await CRIPTO.novaChave(), b = await CRIPTO.novaChave();
  const k = await CRIPTO.chaveConversa(a.privada, b.publica, "pedido-2");
  const m1 = await CRIPTO.cifrar(k, "sala 438"), m2 = await CRIPTO.cifrar(k, "sala 438");
  assert.ok(!atob(m1.cifra).includes("sala"));
  assert.notEqual(m1.cifra, m2.cifra); assert.notEqual(m1.iv, m2.iv);
});

t("terceiros, outra conversa ou a chave pública não abrem a mensagem", async () => {
  const a = await CRIPTO.novaChave(), b = await CRIPTO.novaChave(), x = await CRIPTO.novaChave();
  const m = await CRIPTO.cifrar(await CRIPTO.chaveConversa(a.privada, b.publica, "pedido-3"), "segredo");
  await assert.rejects(CRIPTO.decifrar(await CRIPTO.chaveConversa(x.privada, a.publica, "pedido-3"), m));
  await assert.rejects(CRIPTO.decifrar(await CRIPTO.chaveConversa(b.privada, a.publica, "pedido-4"), m));
  assert.ok(!("d" in a.publica), "a chave pública não carrega a parte privada");
});

t("anexo de denúncia: só a chave da coordenação abre", async () => {
  const coord = await CRIPTO.novaChave(), outro = await CRIPTO.novaChave();
  const an = await CRIPTO.anexoParaCoordenacao("mensagem ofensiva recebida", coord.publica);
  assert.equal(await CRIPTO.abrirAnexo(coord.privada, an), "mensagem ofensiva recebida");
  await assert.rejects(CRIPTO.abrirAnexo(outro.privada, an));
});
