/**
 * Migration 0002 — retrait des droits des rôles publics de Supabase (anon, authenticated).
 *
 * Supabase accorde par défaut ces droits sur les nouvelles tables. La RLS sans règle empêchait déjà
 * toute lecture et toute écriture par la clé publique ; on retire aussi les droits eux-mêmes
 * (double protection), y compris pour les tables créées plus tard par le même rôle.
 * Sans ces rôles (PGlite dans les tests), la migration ne fait rien.
 */
export const retraitDroitsPublics = /* sql */ `
do $$
declare
  role_public text;
begin
  foreach role_public in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_public) then
      execute format('revoke all on all tables in schema public from %I', role_public);
      execute format('revoke all on all sequences in schema public from %I', role_public);
      execute format('alter default privileges in schema public revoke all on tables from %I', role_public);
      execute format('alter default privileges in schema public revoke all on sequences from %I', role_public);
    end if;
  end loop;
end
$$;
`
