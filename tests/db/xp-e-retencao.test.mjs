// O XP calculado no servidor tem de bater com as regras do app (bloco <regras-xp>), e a retenção apaga o que deve.
import { test } from "node:test";
import assert from "node:assert/strict";
import { novoBanco } from "./_banco.mjs";
import { R, em, H } from "../unit/_regras.mjs";

// gera cenários com várias duplas, horários próximos (janela de 12 h), muitos no mesmo dia (limite 10) e contribuições
function* cenarios(n){
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < n; k++){
    const eventos = [], contribs = [];
    const base = em(2026, 3, 2, 8);
    for (let i = 0; i < 40; i++){
      const h = Math.floor(rnd()*3), r = 3 + Math.floor(rnd()*9);   // ajudantes 0..2, quem pede 3..11 (força o limite de 10 por dia)
      eventos.push({ h, r, at: base + Math.floor(rnd()*48)*H/2 + Math.floor(rnd()*50)*60e3, util: rnd() < 0.5 });
    }
    for (let i = 0; i < 16; i++) contribs.push({ u: Math.floor(rnd()*12), at: base + Math.floor(rnd()*20)*H, novo: rnd() < 0.5, foto: rnd() < 0.4, ok: rnd() < 0.8 });
    yield { eventos, contribs };
  }
}

test("XP do servidor = XP do app em 12 cenários sorteados (janela de 12 h, limite diário, primeira vez, contribuições)", async () => {
  let totalEventos = 0, totalAjudas = 0;
  for (const { eventos, contribs } of cenarios(12)){
    const b = await novoBanco();
    const P = []; for (let i = 0; i < 12; i++) P.push(await b.pessoa({ apelido: "Pessoa " + i }));
    for (const t of ["pedidos","ofertas","confirmacoes","contribuicoes"]) await b.sql(`alter table public.${t} disable trigger user`);
    const confirm = new Map(), pedidos = new Map(), ajudando = new Map(), mod = { suspensos: {}, ocultos: {}, contrib: {} };
    let n = 0;
    for (const e of eventos){
      const id = `10000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, H_ = P[e.h].id, R_ = P[e.r].id;
      const at = new Date(e.at).toISOString(), of = new Date(e.at - 10*60e3).toISOString();
      await b.sql("insert into public.pedidos (id, autor, texto, estado, criado_em, fechado_em) values ($1,$2,'ajuda','resolvido',$3,$4)", [id, R_, of, at]);
      await b.sql("insert into public.ofertas (pedido, ajudante, criado_em) values ($1,$2,$3)", [id, H_, of]);
      await b.sql("insert into public.confirmacoes (pedido, ajudante, ajudado, util, criado_em) values ($1,$2,$3,$4,$5)", [id, H_, R_, e.util, at]);
      (pedidos.get(R_) || pedidos.set(R_, {}).get(R_))[id] = { status: "resolvido" };
      (ajudando.get(H_) || ajudando.set(H_, {}).get(H_))[R_ + ":" + id] = { at: e.at - 10*60e3 };
      (confirm.get(R_) || confirm.set(R_, { itens: {} }).get(R_)).itens[id] = { helper: H_, util: e.util ? true : null, at: e.at };
    }
    for (const c of contribs){
      const id = `20000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, U = P[c.u].id, at = new Date(c.at).toISOString();
      await b.sql("insert into public.contribuicoes (id, autor, tipo, texto, foto, estado, decidido_em) values ($1,$2,$3,'x',$4,$5,$6)",
        [id, U, c.novo ? "novo" : "erro", c.foto ? `${U}/${id}.jpg` : null, c.ok ? "aprovada" : "recusada", at]);
      if (c.ok) mod.contrib[U + ":" + id] = { ok: true, at: c.at, novo: c.novo, foto: c.foto };
    }
    const js = R.calcularXP({ confirm, pedidos, ajudando, mod }).by;
    totalEventos += eventos.length; totalAjudas += Object.values(js).reduce((t, v) => t + v.helps, 0);
    const sql = Object.fromEntries((await b.sql("select uid, xp, ajudas, contribuicoes from privado.calcular_xp()")).rows.map(r => [r.uid, r]));
    for (const p of P){
      const a = js[p.id], s = sql[p.id];
      assert.equal(s ? s.xp : 0, a ? a.xp : 0, `XP de ${p.id}`);
      assert.equal(s ? s.ajudas : 0, a ? a.helps : 0, `ajudas de ${p.id}`);
      assert.equal(s ? s.contribuicoes : 0, a ? a.contrib : 0, `contribuições de ${p.id}`);
    }
  }
  assert.ok(totalAjudas < totalEventos * 0.9, "os cenários precisam esbarrar nos limites (janela e teto diário)");
});

test("retenção: mensagens com mais de 30 dias somem; texto de pedido encerrado é apagado; o XP fica", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" });
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('onde fica a sala 438?') returning id");
  await b.como(h, "insert into public.ofertas (pedido) values ($1)", [p.id]);
  await b.como(h, "insert into public.mensagens (pedido, para, cifra, iv) values ($1,$2,'QUJDREVGR0hJSktMTU5PUA==','MTIzNDU2Nzg5MDEy')", [p.id, a.id]);
  await b.como(a, "insert into public.confirmacoes (pedido, ajudante) values ($1, $2)", [p.id, h.id]);
  const antes = (await b.como(h, "select xp from public.meu_xp()")).rows[0].xp;
  await b.sql("select privado.limpeza(now() + interval '29 days')");
  assert.equal((await b.sql("select count(*)::int n from public.mensagens")).rows[0].n, 1, "com 29 dias ainda fica");
  await b.sql("select privado.limpeza(now() + interval '31 days')");
  assert.equal((await b.sql("select count(*)::int n from public.mensagens")).rows[0].n, 0);
  const ped = (await b.sql("select texto, expirado from public.pedidos where id = $1", [p.id])).rows[0];
  assert.deepEqual(ped, { texto: "", expirado: true });
  assert.equal((await b.como(h, "select xp from public.meu_xp()")).rows[0].xp, antes, "o XP não depende do texto");
});

test("retenção: pedido aberto há mais de 7 dias é cancelado; denúncias somem depois de 180 dias", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" });
  await b.como(a, "insert into public.pedidos (texto) values ('alguém?')");
  await b.como(a, "insert into public.denuncias (denunciado, motivo) values ($1, 'spam')", [h.id]);
  await b.sql("select privado.limpeza(now() + interval '8 days')");
  assert.equal((await b.sql("select estado from public.pedidos")).rows[0].estado, "cancelado");
  assert.equal((await b.sql("select count(*)::int n from public.denuncias")).rows[0].n, 1);
  await b.sql("select privado.limpeza(now() + interval '181 days')");
  assert.equal((await b.sql("select count(*)::int n from public.denuncias")).rows[0].n, 0);
});
