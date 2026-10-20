// Cada regra de pontuação do documento de gamificação vira um teste.
import { test } from "node:test";
import assert from "node:assert/strict";
import { R, cenario, em, H, xpDe } from "./_regras.mjs";

test("ajuda confirmada vale 30 XP + 5 na primeira vez com essa pessoa", () => {
  const c = cenario(); c.ajuda("vet", "calouro", em(2026, 3, 10, 10));
  assert.equal(xpDe(c.xp(), "vet"), 35);
});

test("quem pediu marcar a ajuda como útil soma +5", () => {
  const c = cenario(); c.ajuda("vet", "calouro", em(2026, 3, 10, 10), { util: true });
  assert.equal(xpDe(c.xp(), "vet"), 40);
});

test("a mesma dupla só pontua de novo depois de 12 horas, e sem o bônus de primeira vez", () => {
  const c = cenario();
  c.ajuda("vet", "calouro", em(2026, 3, 10, 8));
  c.ajuda("vet", "calouro", em(2026, 3, 10, 9));              // 1 h depois: não conta
  c.ajuda("vet", "calouro", em(2026, 3, 10, 20, 1));          // 12 h e 1 min depois: conta 30
  assert.equal(xpDe(c.xp(), "vet"), 35 + 30);
});

test("ninguém ganha XP confirmando a própria ajuda", () => {
  const c = cenario(); c.ajuda("ana", "ana", em(2026, 3, 10));
  assert.equal(xpDe(c.xp(), "ana"), 0);
});

test("sem oferta de ajuda registrada, a confirmação não vale", () => {
  const c = cenario(); c.ajuda("vet", "calouro", em(2026, 3, 10), { semOferta: true });
  assert.equal(xpDe(c.xp(), "vet"), 0);
});

test("oferta registrada depois da confirmação não vale (evita confirmação combinada)", () => {
  const c = cenario(); const t = em(2026, 3, 10);
  c.ajuda("vet", "calouro", t, { ofertaEm: t + 60e3 });
  assert.equal(xpDe(c.xp(), "vet"), 0);
});

test("só pedido resolvido pontua", () => {
  const c = cenario();
  c.ajuda("vet", "a", em(2026, 3, 10, 9), { status: "aberto" });
  c.ajuda("vet", "b", em(2026, 3, 10, 10), { status: "cancelado" });
  assert.equal(xpDe(c.xp(), "vet"), 0);
});

test("pessoas suspensas pela moderação não pontuam nem dão pontos", () => {
  const c = cenario();
  c.ajuda("vetSuspenso", "calouro", em(2026, 3, 10, 9));
  c.ajuda("vet", "calouroSuspenso", em(2026, 3, 10, 10));
  c.mod.suspensos = { vetSuspenso: true, calouroSuspenso: true };
  const r = c.xp();
  assert.equal(xpDe(r, "vetSuspenso"), 0);
  assert.equal(xpDe(r, "vet"), 0);
});

test("pedido escondido pela moderação não pontua", () => {
  const c = cenario(); const id = c.ajuda("vet", "calouro", em(2026, 3, 10));
  c.mod.ocultos = { ["calouro:" + id]: true };
  assert.equal(xpDe(c.xp(), "vet"), 0);
});

test("no máximo 10 ajudas pontuam por dia; no dia seguinte volta a contar", () => {
  const c = cenario();
  for (let i = 0; i < 12; i++) c.ajuda("vet", "calouro" + i, em(2026, 3, 10, 8, i * 5));
  c.ajuda("vet", "calouroNovo", em(2026, 3, 11, 9));
  const r = c.xp();
  assert.equal(r.by.vet.helps, 11);                           // 10 no dia 10 + 1 no dia 11
  assert.equal(xpDe(r, "vet"), 11 * 35);
});

test("o dia é contado no horário de Teresina para todos os aparelhos", () => {
  const c = cenario();
  for (let i = 0; i < 10; i++) c.ajuda("vet", "c" + i, em(2026, 3, 10, 22, i));   // 22h de Teresina = 01h UTC do dia seguinte
  c.ajuda("vet", "c10", em(2026, 3, 10, 23, 50));             // ainda dia 10 em Teresina: passa do limite, não conta
  c.ajuda("vet", "c11", em(2026, 3, 11, 0, 10));              // dia 11 em Teresina: conta
  assert.equal(c.xp().by.vet.helps, 11);
});

test("contribuições aprovadas: lugar novo 40, erro ou atualização 20, foto +10", () => {
  const c = cenario();
  c.contrib("ana", "a1", { novo: true });
  c.contrib("ana", "a2", { novo: false });
  c.contrib("ana", "a3", { novo: true, foto: true });
  c.contrib("ana", "a4", { novo: false, foto: true });
  assert.equal(xpDe(c.xp(), "ana"), 40 + 20 + 50 + 30);
});

test("contribuição recusada não vale nada", () => {
  const c = cenario(); c.contrib("ana", "a1", { ok: false, novo: true, foto: true });
  assert.equal(xpDe(c.xp(), "ana"), 0);
});

test("no máximo 5 contribuições pontuam por dia", () => {
  const c = cenario();
  for (let i = 0; i < 8; i++) c.contrib("ana", "x" + i, { quando: em(2026, 3, 10, 9, i) });
  assert.equal(c.xp().by.ana.contrib, 5);
});

test("títulos mudam nos limites certos", () => {
  assert.equal(R.titleFor(0).title, "Aprendiz de Guia");
  assert.equal(R.titleFor(99).title, "Aprendiz de Guia");
  assert.equal(R.titleFor(100).title, "Guia do Campus");
  assert.equal(R.titleFor(300).title, "Guardião dos Calouros");
  assert.equal(R.titleFor(700).title, "Mestre dos Caminhos");
  assert.equal(R.titleFor(1500).title, "Lenda da UFPI");
  assert.equal(R.titleFor(1500).next, null);
});

test("ajudas recebidas são contadas para quem pediu", () => {
  const c = cenario();
  c.ajuda("v1", "calouro", em(2026, 3, 10, 8)); c.ajuda("v2", "calouro", em(2026, 3, 10, 9));
  assert.equal(c.xp().recv.calouro, 2);
});

test("o mês do ranking também é o de Teresina", () => {
  assert.equal(R.monthKey(Date.UTC(2026, 3, 1, 1, 0)), "2026-3");   // 31/03 às 22h em Teresina
  assert.equal(R.monthKey(Date.UTC(2026, 3, 1, 4, 0)), "2026-4");
});
