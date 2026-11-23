/**
 * Migration 0003 — comptes de l'équipe LOGIMAR (étape 7C, docs/PLAN_BASE_DE_DONNEES.md).
 *
 * Les identifiants (e-mail, mot de passe) sont dans Supabase Auth ; `profils` ajoute le nom, le rôle,
 * l'état du compte et l'obligation de changer le mot de passe provisoire. `journal_audit` garde qui a fait
 * quoi (comptes dès maintenant, paliers à l'étape D).
 * Pas de clé étrangère vers auth.users : le schéma reste applicable sans Supabase (PGlite dans les tests).
 * RLS sans règle et aucun droit public, comme les autres tables (le serveur seul y accède).
 */
export const comptesGestion = /* sql */ `
create table profils (
  id text primary key,
  email text not null unique,
  nom text not null,
  role text not null check (role in ('administrateur', 'direction', 'revenue', 'embarquement')),
  actif boolean not null default true,
  doit_changer_mot_de_passe boolean not null default true,
  cree_le timestamptz not null default now(),
  cree_par text,
  maj_le timestamptz not null default now()
);
alter table profils enable row level security;

create table journal_audit (
  id text primary key,
  le timestamptz not null default now(),
  auteur_id text,
  auteur_nom text not null,
  action text not null,
  cible text,
  avant jsonb,
  apres jsonb,
  motif text
);
create index journal_audit_le on journal_audit (le desc);
alter table journal_audit enable row level security;

do $$
declare
  role_public text;
begin
  foreach role_public in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_public) then
      execute format('revoke all on profils, journal_audit from %I', role_public);
    end if;
  end loop;
end
$$;
`
