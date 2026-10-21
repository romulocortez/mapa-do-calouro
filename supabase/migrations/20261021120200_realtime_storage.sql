-- =====================================================================================================
-- Migração 3: presença ao vivo (Realtime) e fotos das contribuições (Storage).
-- A posição de quem "aparece no mapa" só passa pelo canal privado "mapa:<campus>" do Realtime (presença):
-- não é gravada em nenhuma tabela e some quando a pessoa sai.
-- =====================================================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    execute $p$ create policy "presença no mapa: ouvir" on realtime.messages for select to authenticated
              using (privado.pode_usar() and realtime.topic() ~ '^mapa:(teresina|picos|bomjesus|floriano)$') $p$;
    execute $p$ create policy "presença no mapa: aparecer" on realtime.messages for insert to authenticated
              with check (privado.pode_usar() and realtime.topic() ~ '^mapa:(teresina|picos|bomjesus|floriano)$'
                          and realtime.messages.extension = 'presence') $p$;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('contribuicoes', 'contribuicoes', false, 400000, array['image/jpeg']) on conflict (id) do nothing;
    -- cada pessoa só grava na própria pasta (<uid>/...); só ela e a coordenação veem
    execute $p$ create policy "foto: enviar" on storage.objects for insert to authenticated
              with check (bucket_id = 'contribuicoes' and (storage.foldername(name))[1] = auth.uid()::text and privado.pode_usar()) $p$;
    execute $p$ create policy "foto: ver" on storage.objects for select to authenticated
              using (bucket_id = 'contribuicoes' and ((storage.foldername(name))[1] = auth.uid()::text or privado.eh_coord())) $p$;
    execute $p$ create policy "foto: apagar" on storage.objects for delete to authenticated
              using (bucket_id = 'contribuicoes' and ((storage.foldername(name))[1] = auth.uid()::text or privado.eh_coord())) $p$;
  end if;
end $$;
