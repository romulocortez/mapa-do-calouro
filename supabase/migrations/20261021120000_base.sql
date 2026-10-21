-- =====================================================================================================
-- Mapa do Calouro · banco no Supabase · migração 1: tabelas, regras de acesso (RLS) e funções
-- Princípios (CLAUDE.md e docs/TERMO-DE-USO-E-PRIVACIDADE.md):
--   * só entra quem tem e-mail @ufpi.edu.br, aceitou o termo e declarou ter 18 anos ou mais;
--   * nenhum dado que a pessoa não precise (sem telefone, CPF, matrícula, endereço, foto de perfil, e-mail nas tabelas);
--   * a localização ao vivo NÃO fica no banco (só passa pelo Realtime, ver migração 3);
--   * conversas são cifradas no celular: o banco só guarda texto cifrado;
--   * XP é calculado aqui, a partir de dados que o celular não consegue forjar;
--   * cada tabela tem RLS; a coordenação lê só denúncias e contribuições.
-- =====================================================================================================

-- funções internas ficam fora da API (o PostgREST só publica o schema public)
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- a API anônima não lê nada: o mapa em si não depende do banco
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on functions from public;

-- ---------------------------------------------------------------------------------------------------
-- quem é da coordenação (inserido à mão pelo dono no SQL editor; ver docs/SUPABASE.md)
-- chave_publica: chave ECDH (JWK) do aparelho da coordenação, usada para cifrar anexos de denúncias
create table public.coordenacao (
  uid uuid primary key references auth.users on delete cascade,
  chave_publica jsonb,
  desde timestamptz not null default now()
);

-- termo aceito: versão do termo e a declaração de maioridade (sem data de nascimento)
create table public.consentimentos (
  uid uuid primary key references auth.users on delete cascade default auth.uid(),
  versao text not null check (versao ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  adulto boolean not null check (adulto),          -- menores de 18 não criam conta (só usam o mapa)
  aceito_em timestamptz not null default now()
);

-- suspensões decididas pela coordenação
create table public.moderacao (
  uid uuid primary key references auth.users on delete cascade,
  suspenso boolean not null default true,
  motivo text check (char_length(motivo) <= 300),
  por uuid references auth.users on delete set null,
  em timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------------
-- funções de permissão (usadas pelas regras de acesso)
create or replace function privado.eh_ufpi() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@ufpi.edu.br', false)
$$;

create or replace function privado.eh_coord() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.coordenacao c where c.uid = auth.uid())
$$;

-- pode usar as funções sociais: e-mail UFPI + termo aceito + não suspenso
create or replace function privado.pode_usar() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.eh_ufpi()
     and exists (select 1 from public.consentimentos c where c.uid = auth.uid())
     and not exists (select 1 from public.moderacao m where m.uid = auth.uid() and m.suspenso)
$$;

-- CPF nunca é gravado (mesma regra de dadosPessoaisNoTexto no app)
create or replace function privado.tem_cpf(t text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(t ~ '\m\d{3}\.\d{3}\.\d{3}-\d{2}\M' or t ~* '\mcpf\M[^0-9]{0,12}\d{11}\M', false)
$$;

grant execute on function privado.eh_ufpi(), privado.eh_coord(), privado.pode_usar(), privado.tem_cpf(text) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- perfil público dentro do app (visível a outros alunos logados): apelido, papel, curso e chave pública
create table public.perfis (
  uid uuid primary key references auth.users on delete cascade default auth.uid(),
  apelido text not null check (char_length(apelido) between 2 and 40 and not privado.tem_cpf(apelido)),
  papel text not null check (papel in ('c','v')),          -- calouro ou veterano
  curso text check (char_length(curso) <= 40),
  chave_publica jsonb,                                      -- ECDH P-256 (JWK) para conversas cifradas
  ranking boolean not null default false,                   -- aparece no ranking só se quiser
  atualizado_em timestamptz not null default now()
);

-- pedidos de ajuda (texto visível a quem está logado, enquanto aberto)
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references auth.users on delete cascade,
  campus text not null default 'teresina' check (campus in ('teresina','picos','bomjesus','floriano')),
  texto text not null,
  lugar text check (char_length(lugar) <= 60),
  estado text not null default 'aberto' check (estado in ('aberto','resolvido','cancelado')),
  oculto boolean not null default false,                    -- escondido pela moderação
  expirado boolean not null default false,                  -- texto apagado pela retenção
  criado_em timestamptz not null default now(),
  fechado_em timestamptz,
  constraint texto_ok check ((expirado and texto = '') or (char_length(texto) between 1 and 240 and not privado.tem_cpf(texto)))
);
create index on public.pedidos (estado, campus);
create index on public.pedidos (autor);

-- quem se ofereceu para ajudar
create table public.ofertas (
  pedido uuid not null references public.pedidos on delete cascade,
  ajudante uuid not null default auth.uid() references auth.users on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (pedido, ajudante)
);
create index on public.ofertas (ajudante);

-- mensagens cifradas no aparelho (AES-GCM com chave ECDH entre as duas pessoas): o banco não lê
create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  pedido uuid not null references public.pedidos on delete cascade,
  de uuid not null default auth.uid() references auth.users on delete cascade,
  para uuid not null references auth.users on delete cascade,
  cifra text not null check (char_length(cifra) between 16 and 4000),
  iv text not null check (char_length(iv) between 12 and 40),
  criado_em timestamptz not null default now()
);
create index on public.mensagens (pedido);

-- confirmação de quem pediu: é o que dá XP a quem ajudou
create table public.confirmacoes (
  pedido uuid primary key references public.pedidos on delete cascade,
  ajudante uuid not null references auth.users on delete cascade,
  ajudado uuid not null default auth.uid() references auth.users on delete cascade,
  util boolean not null default false,
  criado_em timestamptz not null default now()
);

-- denúncias: o motivo é lido pela coordenação; o anexo (trecho da conversa) vem cifrado para a chave da coordenação
create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  denunciante uuid not null default auth.uid() references auth.users on delete cascade,
  denunciado uuid references auth.users on delete cascade,
  pedido uuid references public.pedidos on delete set null,
  motivo text not null check (char_length(motivo) between 1 and 500 and not privado.tem_cpf(motivo)),
  anexo jsonb,                                              -- {epk, iv, cifra}: só a coordenação decifra
  criado_em timestamptz not null default now()
);

-- contribuições ao mapa (lugar novo, atualização, erro)
create table public.contribuicoes (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null default auth.uid() references auth.users on delete cascade,
  campus text not null default 'teresina' check (campus in ('teresina','picos','bomjesus','floriano')),
  tipo text not null check (tipo in ('novo','atualizacao','erro')),
  texto text not null check (char_length(texto) between 1 and 600 and not privado.tem_cpf(texto)),
  x real, y real,
  foto text check (foto is null or foto ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),   -- caminho no Storage (pasta da pessoa)
  estado text not null default 'pendente' check (estado in ('pendente','aprovada','recusada')),
  decidido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on public.contribuicoes (autor);

-- ---------------------------------------------------------------------------------------------------
-- gatilhos: o servidor carimba as horas e protege campos que o celular não pode mudar
create or replace function privado.carimbar() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
  end if;
  return new;
end $$;
create trigger carimbo before insert on public.pedidos for each row execute function privado.carimbar();
create trigger carimbo before insert on public.ofertas for each row execute function privado.carimbar();
create trigger carimbo before insert on public.mensagens for each row execute function privado.carimbar();
create trigger carimbo before insert on public.confirmacoes for each row execute function privado.carimbar();
create trigger carimbo before insert on public.denuncias for each row execute function privado.carimbar();
create trigger carimbo before insert on public.contribuicoes for each row execute function privado.carimbar();

create or replace function privado.consentimento_agora() returns trigger
language plpgsql set search_path = '' as $$
begin new.aceito_em := now(); return new; end $$;
create trigger carimbo before insert or update on public.consentimentos for each row execute function privado.consentimento_agora();

create or replace function privado.perfil_agora() returns trigger
language plpgsql set search_path = '' as $$
begin new.atualizado_em := now(); return new; end $$;
create trigger carimbo before insert or update on public.perfis for each row execute function privado.perfil_agora();

-- pedido: o autor só pode fechar; a coordenação só pode ocultar; ninguém reescreve o texto
create or replace function privado.pedido_update() returns trigger
language plpgsql set search_path = '' as $$   -- roda como quem chamou (current_user = papel da API)
begin
  if new.id <> old.id or new.autor <> old.autor or new.campus <> old.campus or new.criado_em <> old.criado_em
     or new.texto <> old.texto or coalesce(new.lugar,'') <> coalesce(old.lugar,'') or new.expirado <> old.expirado then
    if current_user not in ('postgres','service_role','supabase_admin') then
      raise exception 'campo protegido';
    end if;
  end if;
  if new.oculto <> old.oculto and not privado.eh_coord() and current_user not in ('postgres','service_role','supabase_admin') then
    raise exception 'só a coordenação oculta pedidos';
  end if;
  if new.estado <> old.estado then
    if old.estado <> 'aberto' and current_user not in ('postgres','service_role','supabase_admin') then
      raise exception 'pedido já encerrado';
    end if;
    new.fechado_em := now();
  end if;
  return new;
end $$;
create trigger protege before update on public.pedidos for each row execute function privado.pedido_update();

-- no máximo 3 pedidos abertos por pessoa
create or replace function privado.limite_pedidos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.pedidos p where p.autor = new.autor and p.estado = 'aberto') >= 3 then
    raise exception 'você já tem 3 pedidos abertos';
  end if;
  return new;
end $$;
create trigger limite before insert on public.pedidos for each row execute function privado.limite_pedidos();

-- contribuição: só a coordenação decide; ninguém reescreve depois de enviada; até 10 por dia por pessoa (anti-spam)
create or replace function privado.contribuicao_update() returns trigger
language plpgsql set search_path = '' as $$   -- roda como quem chamou (current_user = papel da API)
begin
  if new.estado <> old.estado then
    if not privado.eh_coord() and current_user not in ('postgres','service_role','supabase_admin') then
      raise exception 'só a coordenação decide contribuições';
    end if;
    new.decidido_em := now();
  end if;
  if new.autor <> old.autor or new.texto <> old.texto or new.tipo <> old.tipo or new.criado_em <> old.criado_em
     or coalesce(new.foto,'') <> coalesce(old.foto,'') or new.x is distinct from old.x or new.y is distinct from old.y then
    if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'campo protegido'; end if;
  end if;
  return new;
end $$;
create trigger protege before update on public.contribuicoes for each row execute function privado.contribuicao_update();

create or replace function privado.limite_contribuicoes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.contribuicoes c where c.autor = new.autor and c.criado_em > now() - interval '1 day') >= 10 then
    raise exception 'limite de contribuições por dia';
  end if;
  return new;
end $$;
create trigger limite before insert on public.contribuicoes for each row execute function privado.limite_contribuicoes();

-- confirmação marca o pedido como resolvido
create or replace function privado.confirmar_resolve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.pedidos set estado = 'resolvido' where id = new.pedido and estado = 'aberto';
  return new;
end $$;
create trigger resolve after insert on public.confirmacoes for each row execute function privado.confirmar_resolve();

-- ---------------------------------------------------------------------------------------------------
-- verificações usadas pelas regras de acesso
create or replace function privado.pedido_aberto_de_outro(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pedidos x where x.id = p and x.estado = 'aberto' and not x.oculto and x.autor <> auth.uid())
$$;
create or replace function privado.participa(p uuid, quem uuid) returns boolean   -- autor do pedido ou quem ofereceu ajuda
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pedidos x where x.id = p and x.autor = quem)
      or exists (select 1 from public.ofertas o where o.pedido = p and o.ajudante = quem)
$$;
create or replace function privado.autor_do_pedido(p uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select autor from public.pedidos where id = p
$$;
create or replace function privado.ofereceu(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ofertas o where o.pedido = p and o.ajudante = auth.uid())
$$;
create or replace function privado.confirmacao_valida(p uuid, h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select h <> auth.uid()
     and exists (select 1 from public.pedidos x where x.id = p and x.autor = auth.uid() and x.estado = 'aberto' and not x.oculto)
     and exists (select 1 from public.ofertas o where o.pedido = p and o.ajudante = h)
$$;
grant execute on function privado.pedido_aberto_de_outro(uuid), privado.participa(uuid, uuid), privado.autor_do_pedido(uuid),
  privado.ofereceu(uuid), privado.confirmacao_valida(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- regras de acesso (RLS). Sem política = ninguém (além do dono do banco) acessa.
alter table public.coordenacao   enable row level security;
alter table public.consentimentos enable row level security;
alter table public.moderacao     enable row level security;
alter table public.perfis        enable row level security;
alter table public.pedidos       enable row level security;
alter table public.ofertas       enable row level security;
alter table public.mensagens     enable row level security;
alter table public.confirmacoes  enable row level security;
alter table public.denuncias     enable row level security;
alter table public.contribuicoes enable row level security;

grant select on public.coordenacao to authenticated;
create policy "chave pública da coordenação" on public.coordenacao for select to authenticated using (privado.pode_usar());

grant select, insert, update on public.consentimentos to authenticated;
create policy "ver o próprio termo" on public.consentimentos for select to authenticated using (uid = auth.uid());
create policy "aceitar o termo" on public.consentimentos for insert to authenticated with check (uid = auth.uid() and privado.eh_ufpi());
create policy "aceitar nova versão" on public.consentimentos for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());

grant select, insert, update, delete on public.moderacao to authenticated;
create policy "ver a própria suspensão" on public.moderacao for select to authenticated using (uid = auth.uid() or privado.eh_coord());
create policy "coordenação suspende" on public.moderacao for insert to authenticated with check (privado.eh_coord() and uid <> auth.uid());
create policy "coordenação altera" on public.moderacao for update to authenticated using (privado.eh_coord());
create policy "coordenação remove" on public.moderacao for delete to authenticated using (privado.eh_coord());

grant select, insert, update, delete on public.perfis to authenticated;
create policy "perfis visíveis a quem usa" on public.perfis for select to authenticated using (privado.pode_usar() or uid = auth.uid());
create policy "criar o próprio perfil" on public.perfis for insert to authenticated with check (uid = auth.uid() and privado.pode_usar());
create policy "editar o próprio perfil" on public.perfis for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid() and privado.pode_usar());
create policy "apagar o próprio perfil" on public.perfis for delete to authenticated using (uid = auth.uid());

grant select, insert, update on public.pedidos to authenticated;
create policy "ver pedidos" on public.pedidos for select to authenticated using (
  autor = auth.uid() or privado.eh_coord()
  or (privado.pode_usar() and ((estado = 'aberto' and not oculto) or privado.ofereceu(id))));
create policy "fazer pedido" on public.pedidos for insert to authenticated with check (autor = auth.uid() and privado.pode_usar() and estado = 'aberto' and not oculto);
create policy "fechar o próprio pedido" on public.pedidos for update to authenticated using (autor = auth.uid() or privado.eh_coord());

grant select, insert, delete on public.ofertas to authenticated;
create policy "ver ofertas" on public.ofertas for select to authenticated using (ajudante = auth.uid() or privado.autor_do_pedido(pedido) = auth.uid());
create policy "oferecer ajuda" on public.ofertas for insert to authenticated with check (ajudante = auth.uid() and privado.pode_usar() and privado.pedido_aberto_de_outro(pedido));
create policy "retirar oferta" on public.ofertas for delete to authenticated using (ajudante = auth.uid());

grant select, insert, delete on public.mensagens to authenticated;
create policy "ler as próprias conversas" on public.mensagens for select to authenticated using (auth.uid() in (de, para));
create policy "mandar mensagem" on public.mensagens for insert to authenticated with check (
  de = auth.uid() and para <> de and privado.pode_usar()
  and privado.participa(pedido, de) and privado.participa(pedido, para)
  and (privado.autor_do_pedido(pedido) in (de, para)));          -- conversa sempre entre quem pediu e quem ajuda
create policy "apagar a própria mensagem" on public.mensagens for delete to authenticated using (de = auth.uid());

grant select, insert on public.confirmacoes to authenticated;
create policy "ver confirmações" on public.confirmacoes for select to authenticated using (auth.uid() in (ajudante, ajudado) or privado.eh_coord());
create policy "confirmar ajuda" on public.confirmacoes for insert to authenticated with check (ajudado = auth.uid() and privado.pode_usar() and privado.confirmacao_valida(pedido, ajudante));

grant select, insert, delete on public.denuncias to authenticated;
create policy "ver denúncias" on public.denuncias for select to authenticated using (denunciante = auth.uid() or privado.eh_coord());
create policy "denunciar" on public.denuncias for insert to authenticated with check (denunciante = auth.uid() and privado.pode_usar() and coalesce(denunciado, '00000000-0000-0000-0000-000000000000') <> auth.uid());
create policy "coordenação arquiva" on public.denuncias for delete to authenticated using (privado.eh_coord());

grant select, insert, update, delete on public.contribuicoes to authenticated;
create policy "ver contribuições" on public.contribuicoes for select to authenticated using (autor = auth.uid() or privado.eh_coord());
create policy "contribuir" on public.contribuicoes for insert to authenticated with check (autor = auth.uid() and privado.pode_usar() and estado = 'pendente');
create policy "coordenação decide" on public.contribuicoes for update to authenticated using (privado.eh_coord());
create policy "apagar pendente" on public.contribuicoes for delete to authenticated using ((autor = auth.uid() and estado = 'pendente') or privado.eh_coord());

-- ---------------------------------------------------------------------------------------------------
-- XP no servidor: mesmas regras do bloco <regras-xp> do index.html (os testes comparam os dois)
-- REGRAS: ajuda 30 (+5 útil, +5 primeira vez da dupla); dupla pontua 1x a cada 12 h; 10 ajudas/dia;
--         contribuições aprovadas: lugar novo 40, correção 20, foto +10; 5 por dia; dia contado em UTC−3.
create or replace function privado.calcular_xp() returns table (uid uuid, xp int, ajudas int, contribuicoes int)
language plpgsql stable security definer set search_path = '' as $$
declare
  e record;
  ultimo jsonb := '{}'; vista jsonb := '{}'; por_dia jsonb := '{}'; c_dia jsonb := '{}';
  m_xp jsonb := '{}'; m_aj jsonb := '{}'; m_co jsonb := '{}';
  pk text; dk text; pontos int; t_ms double precision; k text;
begin
  for e in
    select c.ajudante as h, c.ajudado as r, c.criado_em as em, c.util
    from public.confirmacoes c
    join public.pedidos p on p.id = c.pedido
    join public.ofertas o on o.pedido = c.pedido and o.ajudante = c.ajudante
    where c.ajudante <> c.ajudado and p.autor = c.ajudado and p.estado = 'resolvido' and not p.oculto
      and o.criado_em <= c.criado_em
      and not exists (select 1 from public.moderacao m where m.suspenso and m.uid in (c.ajudante, c.ajudado))
    order by c.criado_em
  loop
    t_ms := extract(epoch from e.em) * 1000;
    pk := e.h || '|' || e.r;
    if ultimo ? pk and t_ms - (ultimo ->> pk)::double precision < 12*3600e3 then continue; end if;
    dk := e.h || '|' || floor((t_ms - 3*3600e3) / 86400e3);
    if coalesce((por_dia ->> dk)::int, 0) >= 10 then continue; end if;
    ultimo := ultimo || jsonb_build_object(pk, t_ms);
    por_dia := por_dia || jsonb_build_object(dk, coalesce((por_dia ->> dk)::int, 0) + 1);
    pontos := 30 + case when e.util then 5 else 0 end + case when vista ? pk then 0 else 5 end;
    vista := vista || jsonb_build_object(pk, 1);
    k := e.h::text;
    m_xp := m_xp || jsonb_build_object(k, coalesce((m_xp ->> k)::int, 0) + pontos);
    m_aj := m_aj || jsonb_build_object(k, coalesce((m_aj ->> k)::int, 0) + 1);
  end loop;
  for e in
    select c.autor as u, c.decidido_em as em, c.tipo, (c.foto is not null) as foto
    from public.contribuicoes c
    where c.estado = 'aprovada' and c.decidido_em is not null
      and not exists (select 1 from public.moderacao m where m.suspenso and m.uid = c.autor)
    order by c.decidido_em
  loop
    t_ms := extract(epoch from e.em) * 1000;
    dk := e.u || '|' || floor((t_ms - 3*3600e3) / 86400e3);
    if coalesce((c_dia ->> dk)::int, 0) >= 5 then continue; end if;
    c_dia := c_dia || jsonb_build_object(dk, coalesce((c_dia ->> dk)::int, 0) + 1);
    pontos := case when e.tipo = 'novo' then 40 else 20 end + case when e.foto then 10 else 0 end;
    k := e.u::text;
    m_xp := m_xp || jsonb_build_object(k, coalesce((m_xp ->> k)::int, 0) + pontos);
    m_co := m_co || jsonb_build_object(k, coalesce((m_co ->> k)::int, 0) + 1);
  end loop;
  return query select j.key::uuid, j.value::text::int, coalesce((m_aj ->> j.key)::int, 0), coalesce((m_co ->> j.key)::int, 0)
               from jsonb_each(m_xp) j;
end $$;
revoke all on function privado.calcular_xp() from public, authenticated;

-- o próprio XP
create or replace function public.meu_xp() returns table (xp int, ajudas int, contribuicoes int)
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(x.xp),0)::int, coalesce(sum(x.ajudas),0)::int, coalesce(sum(x.contribuicoes),0)::int
  from privado.calcular_xp() x where x.uid = auth.uid() and privado.pode_usar()
$$;
-- ranking só com quem pediu para aparecer; devolve apelido e XP (nunca o id)
create or replace function public.ranking(limite int default 20) returns table (apelido text, xp int)
language sql stable security definer set search_path = '' as $$
  select p.apelido, x.xp from privado.calcular_xp() x join public.perfis p on p.uid = x.uid
  where p.ranking and privado.pode_usar() order by x.xp desc, p.apelido limit least(greatest(limite, 1), 100)
$$;
revoke all on function public.meu_xp(), public.ranking(int) from public, anon;
grant execute on function public.meu_xp(), public.ranking(int) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- "Apagar meus dados": remove a conta e, em cascata, tudo o que é da pessoa.
-- As fotos do Storage são apagadas antes pelo app (o Supabase não deixa apagar arquivos por SQL).
create or replace function public.apagar_minha_conta() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.apagar_minha_conta() from public, anon;
grant execute on function public.apagar_minha_conta() to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- só e-mail @ufpi.edu.br cria conta (gancho "Before User Created" do Supabase Auth; ver docs/SUPABASE.md).
-- Mesmo sem o gancho ligado, as regras acima exigem e-mail UFPI para qualquer leitura ou escrita.
create or replace function public.hook_antes_de_criar_usuario(event jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare email text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  if email like '%@ufpi.edu.br' then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Use o seu e-mail @ufpi.edu.br.'));
end $$;
revoke all on function public.hook_antes_de_criar_usuario(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_antes_de_criar_usuario(jsonb) to supabase_auth_admin;
  end if;
end $$;
