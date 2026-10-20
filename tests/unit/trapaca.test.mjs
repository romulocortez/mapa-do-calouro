// "Robôs trapaceiros": contas combinadas tentando farmar XP. Cada teste mostra até onde a regra segura.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cenario, em, H, xpDe } from "./_regras.mjs";

test("dupla combinada confirmando uma à outra a cada 10 minutos: no máximo 2 vezes por dia cada", () => {
  const c = cenario(); const t0 = em(2026, 3, 10, 0, 1);
  for (let i = 0; i < 144; i++){ c.ajuda("a", "b", t0 + i * 10 * 60e3); c.ajuda("b", "a", t0 + i * 10 * 60e3 + 60e3); }
  const r = c.xp();
  assert.equal(r.by.a.helps, 2); assert.equal(r.by.b.helps, 2);
  assert.ok(xpDe(r, "a") <= 35 + 30);
});

test("spam de 30 contribuições aprovadas num dia: só 5 contam", () => {
  const c = cenario();
  for (let i = 0; i < 30; i++) c.contrib("spammer", "s" + i, { novo: true, foto: true, quando: em(2026, 3, 10, 10, i) });
  assert.equal(xpDe(c.xp(), "spammer"), 5 * 50);
});

test("o XP não aceita pontos escritos pelo próprio celular", () => {
  const c = cenario(); c.ajuda("vet", "calouro", em(2026, 3, 10));
  c.confirm.get("calouro").xp = 999999;                                    // campo forjado é ignorado
  c.confirm.get("calouro").itens.falso = { helper: "vet", at: em(2026, 3, 10, 13), xp: 5000 };  // sem pedido nem oferta
  assert.equal(xpDe(c.xp(), "vet"), 35);
});

test("ANEL de 6 contas falsas que se ajudam em roda: as regras atuais limitam, mas não impedem", () => {
  const c = cenario(); const contas = ["f1", "f2", "f3", "f4", "f5", "f6"];
  let t = em(2026, 3, 10, 8);
  for (const a of contas) for (const b of contas) if (a !== b){ c.ajuda(a, b, t); t += 60e3; }
  const r = c.xp();
  for (const a of contas) assert.equal(xpDe(r, a), 5 * 35);               // 175 XP por conta no primeiro dia
});

test.todo("ANEL: o servidor precisa barrar — XP só para e-mail institucional, conta com alguns dias de idade e detecção de grupos que só se ajudam entre si (fase Supabase)");
