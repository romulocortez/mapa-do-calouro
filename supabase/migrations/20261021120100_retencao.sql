-- =====================================================================================================
-- Migração 2: retenção (LGPD: guardar só pelo tempo necessário). Roda todo dia às 03h15 (horário de Brasília).
--   * mensagens: apagadas 30 dias depois de enviadas;
--   * pedidos encerrados há mais de 30 dias: o texto é apagado (o XP não depende do texto);
--   * pedidos abertos há mais de 7 dias: viram "cancelado";
--   * denúncias: apagadas depois de 180 dias; contribuições recusadas: depois de 180 dias.
-- =====================================================================================================
create or replace function privado.limpeza(agora timestamptz default now()) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.mensagens where criado_em < agora - interval '30 days';
  update public.pedidos set estado = 'cancelado' where estado = 'aberto' and criado_em < agora - interval '7 days';
  update public.pedidos set texto = '', lugar = null, expirado = true
   where estado in ('resolvido','cancelado') and not expirado and fechado_em < agora - interval '30 days';
  delete from public.denuncias where criado_em < agora - interval '180 days';
  delete from public.contribuicoes where estado = 'recusada' and decidido_em < agora - interval '180 days';
end $$;
revoke all on function privado.limpeza(timestamptz) from public, authenticated;

-- agenda no pg_cron (existe no Supabase; nos testes locais ele não existe e o agendamento é pulado)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('mapa-limpeza-diaria', '15 6 * * *', 'select privado.limpeza()');   -- 06h15 UTC = 03h15 em Teresina
  end if;
end $$;
