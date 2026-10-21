// Banco de teste: Postgres de verdade (PGlite, em WebAssembly) com o mínimo do Supabase imitado
// (papéis anon/authenticated, auth.users, auth.uid(), auth.jwt()) e as migrações de supabase/migrations.
// Dados sempre inventados (regra 15).
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const PASTA = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));

const SUPABASE_FALSO = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role supabase_auth_admin nologin;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
`;

export async function novoBanco(){
  const db = new PGlite();
  await db.exec(SUPABASE_FALSO);
  for (const f of readdirSync(PASTA).filter(n => n.endsWith(".sql")).sort()) await db.exec(readFileSync(PASTA + f, "utf8"));
  let n = 0;
  const api = {
    db,
    // cria uma pessoa (como faria o Supabase Auth); por padrão já com e-mail UFPI e termo aceito
    async pessoa({ email, termo = true, apelido } = {}){
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
      email = email || `aluno.teste${n}@ufpi.edu.br`;
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
      const p = { id, email };
      if (termo) await api.como(p, "insert into public.consentimentos (versao, adulto) values ('2026-10-21', true)");
      if (apelido) await api.como(p, "insert into public.perfis (apelido, papel) values ($1, 'c')", [apelido]);
      return p;
    },
    // roda SQL como a pessoa logada (papel authenticated + token com sub e e-mail), igual à API do Supabase
    async como(p, sql, params = []){
      return db.transaction(async tx => {
        if (p){
          await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: p.id, email: p.email, role: "authenticated" })]);
          await tx.query("set local role authenticated");
        } else await tx.query("set local role anon");
        return tx.query(sql, params);
      });
    },
    async falha(p, sql, params = []){
      try { await api.como(p, sql, params); } catch (e) { return e.message; }
      return null;
    },
    sql: (s, p = []) => db.query(s, p),
  };
  return api;
}
