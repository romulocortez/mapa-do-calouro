// Regras de acesso do banco (RLS): cada teste tenta o que um aluno mal-intencionado tentaria e precisa falhar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { novoBanco } from "./_banco.mjs";

const TABELAS = ["coordenacao","consentimentos","moderacao","perfis","pedidos","ofertas","mensagens","confirmacoes","denuncias","contribuicoes"];

test("sem login ninguém lê nada (o mapa em si não depende do banco)", async () => {
  const b = await novoBanco(); await b.pessoa({ apelido: "Ana Teste" });
  for (const t of TABELAS) assert.match(await b.falha(null, `select * from public.${t}`) || "", /permission denied/, t);
  assert.match(await b.falha(null, "select * from public.ranking()") || "", /permission denied/);
});

test("e-mail que não é @ufpi.edu.br não aceita o termo nem lê perfis", async () => {
  const b = await novoBanco(); await b.pessoa({ apelido: "Ana Teste" });
  const de_fora = await b.pessoa({ email: "alguem.teste@exemplo.com", termo: false });
  assert.ok(await b.falha(de_fora, "insert into public.consentimentos (versao, adulto) values ('2026-10-21', true)"));
  assert.equal((await b.como(de_fora, "select * from public.perfis")).rows.length, 0);
});

test("sem aceitar o termo não cria perfil nem pedido; menor de 18 não aceita o termo", async () => {
  const b = await novoBanco();
  const p = await b.pessoa({ termo: false });
  assert.ok(await b.falha(p, "insert into public.perfis (apelido, papel) values ('Bia Teste','c')"));
  assert.ok(await b.falha(p, "insert into public.pedidos (texto) values ('onde fica o bloco 5?')"));
  assert.match(await b.falha(p, "insert into public.consentimentos (versao, adulto) values ('2026-10-21', false)") || "", /check/);
});

test("ninguém altera o perfil de outra pessoa", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), c = await b.pessoa({ apelido: "Caio Teste" });
  await b.como(c, "update public.perfis set apelido = 'Hackeado' where uid = $1", [a.id]);
  assert.equal((await b.sql("select apelido from public.perfis where uid = $1", [a.id])).rows[0].apelido, "Ana Teste");
  await b.como(c, "delete from public.perfis where uid = $1", [a.id]);
  assert.equal((await b.sql("select count(*)::int n from public.perfis")).rows[0].n, 2);
});

test("pedidos: CPF é recusado, o texto não pode ser reescrito e há no máximo 3 abertos", async () => {
  const b = await novoBanco(); const a = await b.pessoa({ apelido: "Ana Teste" });
  assert.ok(await b.falha(a, "insert into public.pedidos (texto) values ('meu cpf 123.456.789-00')"));
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('onde fica a sala 438?') returning id");
  assert.match(await b.falha(a, "update public.pedidos set texto = 'outro' where id = $1", [p.id]) || "", /protegido/);
  await b.como(a, "insert into public.pedidos (texto) values ('dois')"); await b.como(a, "insert into public.pedidos (texto) values ('três')");
  assert.match(await b.falha(a, "insert into public.pedidos (texto) values ('quatro')") || "", /3 pedidos/);
});

test("ofertas: não dá para ajudar a si mesmo; só quem pediu e quem ajudou veem a oferta", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" }), x = await b.pessoa({ apelido: "Xavier Teste" });
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('ajuda com o SIGAA') returning id");
  assert.ok(await b.falha(a, "insert into public.ofertas (pedido) values ($1)", [p.id]));
  await b.como(h, "insert into public.ofertas (pedido) values ($1)", [p.id]);
  assert.equal((await b.como(a, "select * from public.ofertas")).rows.length, 1);
  assert.equal((await b.como(x, "select * from public.ofertas")).rows.length, 0);
});

test("mensagens: só entre quem pediu e quem ajuda; terceiros não leem nem escrevem", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" }), x = await b.pessoa({ apelido: "Xavier Teste" });
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('onde é o RU?') returning id");
  await b.como(h, "insert into public.ofertas (pedido) values ($1)", [p.id]);
  const CIFRA = "QUJDREVGR0hJSktMTU5PUA==", IV = "MTIzNDU2Nzg5MDEy";
  await b.como(h, "insert into public.mensagens (pedido, para, cifra, iv) values ($1, $2, $3, $4)", [p.id, a.id, CIFRA, IV]);
  await b.como(a, "insert into public.mensagens (pedido, para, cifra, iv) values ($1, $2, $3, $4)", [p.id, h.id, CIFRA, IV]);
  assert.equal((await b.como(a, "select * from public.mensagens")).rows.length, 2);
  assert.equal((await b.como(x, "select * from public.mensagens")).rows.length, 0);
  assert.ok(await b.falha(x, "insert into public.mensagens (pedido, para, cifra, iv) values ($1, $2, $3, $4)", [p.id, a.id, CIFRA, IV]));
  assert.ok(await b.falha(h, "insert into public.mensagens (pedido, para, cifra, iv) values ($1, $2, $3, $4)", [p.id, x.id, CIFRA, IV]));
  // e o banco nunca recebe o texto aberto: só há colunas de texto cifrado
  const cols = (await b.sql("select column_name from information_schema.columns where table_name = 'mensagens'")).rows.map(r => r.column_name);
  assert.deepEqual(cols.sort(), ["cifra","criado_em","de","id","iv","para","pedido"]);
});

test("confirmação: só quem pediu confirma, só para quem ofereceu ajuda, e a hora é a do servidor", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" }), x = await b.pessoa({ apelido: "Xavier Teste" });
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('onde fica o CT?') returning id");
  assert.ok(await b.falha(a, "insert into public.confirmacoes (pedido, ajudante) values ($1, $2)", [p.id, h.id]), "sem oferta não confirma");
  await b.como(h, "insert into public.ofertas (pedido) values ($1)", [p.id]);
  assert.ok(await b.falha(h, "insert into public.confirmacoes (pedido, ajudante, ajudado) values ($1, $2, $3)", [p.id, h.id, a.id]), "quem ajudou não confirma por quem pediu");
  assert.ok(await b.falha(x, "insert into public.confirmacoes (pedido, ajudante) values ($1, $2)", [p.id, h.id]), "terceiro não confirma");
  await b.como(a, "insert into public.confirmacoes (pedido, ajudante, util, criado_em) values ($1, $2, true, '2020-01-01')", [p.id, h.id]);
  const c = (await b.sql("select criado_em from public.confirmacoes")).rows[0];
  assert.ok(Date.now() - new Date(c.criado_em).getTime() < 60e3, "a hora enviada pelo celular é ignorada");
  assert.equal((await b.sql("select estado from public.pedidos where id = $1", [p.id])).rows[0].estado, "resolvido");
  assert.ok(await b.falha(a, "insert into public.confirmacoes (pedido, ajudante) values ($1, $2)", [p.id, h.id]), "não confirma duas vezes");
  assert.deepEqual((await b.como(h, "select * from public.meu_xp()")).rows[0], { xp: 40, ajudas: 1, contribuicoes: 0 });
  assert.equal((await b.como(x, "select * from public.meu_xp()")).rows[0].xp, 0);
});

test("XP não se forja: ninguém insere XP, aprova a própria contribuição ou chama o cálculo interno", async () => {
  const b = await novoBanco(); const a = await b.pessoa({ apelido: "Ana Teste" });
  const { rows: [c] } = await b.como(a, "insert into public.contribuicoes (tipo, texto) values ('novo', 'bebedouro novo no CT') returning id");
  await b.como(a, "update public.contribuicoes set estado = 'aprovada' where id = $1", [c.id]);   // a regra de acesso ignora a tentativa
  assert.equal((await b.sql("select estado from public.contribuicoes where id = $1", [c.id])).rows[0].estado, "pendente");
  assert.ok(await b.falha(a, "insert into public.contribuicoes (tipo, texto, estado) values ('novo', 'x', 'aprovada')"));
  assert.match(await b.falha(a, "select * from privado.calcular_xp()") || "", /permission denied/);
  assert.equal((await b.como(a, "select * from public.meu_xp()")).rows[0].xp, 0);
});

test("denúncias: a coordenação lê; outros alunos não; a pessoa denunciada não vê quem denunciou", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" }), co = await b.pessoa({ apelido: "Coord Teste" });
  await b.sql("insert into public.coordenacao (uid) values ($1)", [co.id]);
  await b.como(a, "insert into public.denuncias (denunciado, motivo, anexo) values ($1, 'mensagem ofensiva', '{\"epk\":{},\"iv\":\"x\",\"cifra\":\"y\"}')", [h.id]);
  assert.equal((await b.como(h, "select * from public.denuncias")).rows.length, 0);
  assert.equal((await b.como(co, "select * from public.denuncias")).rows.length, 1);
  assert.equal((await b.como(a, "select * from public.denuncias")).rows.length, 1);
  assert.ok(await b.falha(a, "insert into public.denuncias (denunciado, motivo) values ($1, 'eu mesma')", [a.id]));
});

test("coordenação aprova contribuição e o XP aparece; suspensa, a pessoa não posta mais", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), co = await b.pessoa({ apelido: "Coord Teste" });
  await b.sql("insert into public.coordenacao (uid) values ($1)", [co.id]);
  const { rows: [c] } = await b.como(a, "insert into public.contribuicoes (tipo, texto) values ('novo', 'rampa nova no CCE') returning id");
  await b.como(co, "update public.contribuicoes set estado = 'aprovada' where id = $1", [c.id]);
  assert.equal((await b.como(a, "select * from public.meu_xp()")).rows[0].xp, 40);
  await b.como(co, "insert into public.moderacao (uid, motivo) values ($1, 'teste')", [a.id]);
  assert.ok(await b.falha(a, "insert into public.pedidos (texto) values ('oi')"));
  assert.equal((await b.como(a, "select * from public.perfis")).rows.length, 1, "ainda vê o próprio perfil");
});

test("ranking mostra só quem pediu para aparecer, com apelido e sem identificador", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" });
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('ajuda') returning id");
  await b.como(h, "insert into public.ofertas (pedido) values ($1)", [p.id]);
  await b.como(a, "insert into public.confirmacoes (pedido, ajudante) values ($1, $2)", [p.id, h.id]);
  assert.equal((await b.como(a, "select * from public.ranking()")).rows.length, 0);
  await b.como(h, "update public.perfis set ranking = true where uid = $1", [h.id]);
  assert.deepEqual((await b.como(a, "select * from public.ranking()")).rows, [{ apelido: "Hugo Teste", xp: 35 }]);
});

test("apagar meus dados remove a conta e tudo o que é da pessoa", async () => {
  const b = await novoBanco();
  const a = await b.pessoa({ apelido: "Ana Teste" }), h = await b.pessoa({ apelido: "Hugo Teste" });
  const { rows: [p] } = await b.como(a, "insert into public.pedidos (texto) values ('ajuda') returning id");
  await b.como(h, "insert into public.ofertas (pedido) values ($1)", [p.id]);
  await b.como(a, "insert into public.contribuicoes (tipo, texto) values ('erro', 'nome errado')");
  await b.como(a, "select public.apagar_minha_conta()");
  for (const [t, col] of [["users","id"],["consentimentos","uid"],["perfis","uid"],["pedidos","autor"],["contribuicoes","autor"]]){
    const sch = t === "users" ? "auth" : "public";
    assert.equal((await b.sql(`select count(*)::int n from ${sch}.${t} where ${col} = $1`, [a.id])).rows[0].n, 0, t);
  }
  assert.equal((await b.sql("select count(*)::int n from public.ofertas")).rows[0].n, 0, "ofertas no pedido apagado somem junto");
  assert.equal((await b.sql("select count(*)::int n from auth.users")).rows[0].n, 1, "as outras contas ficam");
});

test("só e-mail @ufpi.edu.br cria conta (gancho do Supabase Auth)", async () => {
  const b = await novoBanco();
  const ok = (await b.sql("select public.hook_antes_de_criar_usuario($1) r", [{ user: { email: "Aluno.Teste@UFPI.edu.br" } }])).rows[0].r;
  assert.deepEqual(ok, {});
  const nao = (await b.sql("select public.hook_antes_de_criar_usuario($1) r", [{ user: { email: "aluno.teste@gmail.com" } }])).rows[0].r;
  assert.equal(nao.error.http_code, 403);
  assert.match(await b.falha((await b.pessoa()), "select public.hook_antes_de_criar_usuario('{}'::jsonb)") || "", /permission denied/);
});
