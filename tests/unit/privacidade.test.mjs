// Privacidade: o mapa avisa quando um texto parece ter dado pessoal e apaga conversas antigas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { R, cenario, em, xpDe } from "./_regras.mjs";

const tem = (t, tipo) => R.dadosPessoaisNoTexto(t).includes(tipo);

test("reconhece telefone em vários formatos", () => {
  for (const t of ["meu zap (86) 99999-8888", "liga 86 9 9988 7766", "+55 86 99876-5432", "chama no 99876-5432", "86999887766"])
    assert.ok(tem(t, "telefone"), t);
});

test("reconhece e-mail e CPF", () => {
  assert.ok(tem("me manda em fulano.tal@gmail.com", "email"));
  assert.ok(tem("meu cpf é 123.456.789-09", "cpf"));
  assert.ok(tem("CPF 12345678909", "cpf"));
});

test("não confunde salas, blocos, horários e anos com dado pessoal", () => {
  for (const t of ["sala 535 do Bloco 03", "SG 09 sala 304", "salas 520 a 522", "aula às 14h30 no CT", "semestre 2026.2", "fica a 200 m do RU"])
    assert.deepEqual(R.dadosPessoaisNoTexto(t), [], t);
});

test("conversa de pedido encerrado há mais de 30 dias perde o texto; as recentes ficam", () => {
  const agora = em(2026, 6, 1);
  const pedidos = { itens: {
    velho: { status: "resolvido", texto: "onde é o RU?", notas: [{ t: "obrigado", at: em(2026, 3, 1) }], fechado: em(2026, 3, 1) },
    novo:  { status: "resolvido", texto: "e a biblioteca?", notas: [{ t: "valeu", at: em(2026, 5, 25) }], fechado: em(2026, 5, 25) },
    aberto:{ status: "aberto", texto: "cadê o SG 09?", notas: [], atualizado: em(2026, 3, 1) },
  }};
  const r = R.podarConversas(pedidos, null, agora);
  assert.equal(r.mudou, true);
  assert.equal(r.pedidos.itens.velho.texto, ""); assert.deepEqual(r.pedidos.itens.velho.notas, []);
  assert.equal(r.pedidos.itens.novo.texto, "e a biblioteca?");
  assert.equal(r.pedidos.itens.aberto.texto, "cadê o SG 09?");             // pedido aberto não perde o texto
});

test("mensagens de ajuda com mais de 30 dias são apagadas", () => {
  const agora = em(2026, 6, 1);
  const ofertas = { ofertas: { "c:p1": { at: em(2026, 3, 1), msgs: [{ t: "fica do lado do RU", at: em(2026, 3, 1) }, { t: "te espero lá", at: em(2026, 5, 30) }] } } };
  const r = R.podarConversas(null, ofertas, agora);
  assert.deepEqual(r.ofertas.ofertas["c:p1"].msgs.map(m => m.t), ["te espero lá"]);
});

test("nada para apagar: não reescreve o documento", () => {
  const r = R.podarConversas({ itens: { a: { status: "aberto", texto: "x", notas: [] } } }, { ofertas: {} }, em(2026, 6, 1));
  assert.equal(r.mudou, false);
});

test("apagar conversas antigas não muda o XP de ninguém", () => {
  const c = cenario(); const id = c.ajuda("vet", "calouro", em(2026, 3, 1, 10));
  const antes = xpDe(c.xp(), "vet");
  const ped = c.pedidos.get("calouro"); ped[id].fechado = em(2026, 3, 1, 10);
  const r = R.podarConversas({ itens: ped }, null, em(2026, 6, 1));
  c.pedidos.set("calouro", r.pedidos.itens);
  assert.equal(xpDe(c.xp(), "vet"), antes);
});
