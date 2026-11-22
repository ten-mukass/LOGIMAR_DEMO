/**
 * Migration 0001 — schéma initial (étape A de docs/PLAN_BASE_DE_DONNEES.md).
 * Inspiré du modèle des cahiers des charges (réservation §7, gestion §4), deux tarifs Éco et VIP.
 *
 * Sécurité : la RLS est activée sur toutes les tables, sans aucune règle d'accès. La clé publique
 * de Supabase ne permet donc de rien lire ; seul le serveur de l'application (connexion PostgreSQL
 * directe) lit et écrit.
 *
 * Les identifiants restent des textes : ce sont ceux du domaine (ex. « LBV-POG-2026-11-20-1215 »).
 * Montants en FCFA entiers (le franc CFA n'a pas de centimes).
 */
export const schemaInitial = /* sql */ `
-- Référentiel --------------------------------------------------------------

create table ports (
  id text primary key,
  rang integer not null default 0,
  code text not null unique,
  nom text not null,
  ville text not null
);

create table terminaux (
  id text primary key,
  rang integer not null default 0,
  port_id text not null references ports (id),
  nom text not null,
  adresse text,
  lien_itineraire text,
  actif boolean not null default true
);

create table navires (
  id text primary key,
  rang integer not null default 0,
  nom text not null,
  type text not null,
  capacite_totale integer not null check (capacite_totale > 0),
  capacite_vendable integer not null check (capacite_vendable >= 0 and capacite_vendable <= capacite_totale),
  atouts jsonb not null default '[]'::jsonb,
  photo text not null,
  bagage_soute_kg integer not null,
  bagage_cabine_kg integer not null
);

create table lignes (
  id text primary key,
  rang integer not null default 0,
  port_depart_id text not null references ports (id),
  port_arrivee_id text not null references ports (id),
  check (port_depart_id <> port_arrivee_id)
);

create table regles_programme (
  rang integer primary key,
  ligne_id text not null references lignes (id),
  navire_id text not null references navires (id),
  terminal_depart_id text not null references terminaux (id),
  terminal_arrivee_id text not null references terminaux (id),
  jours_semaine jsonb not null,
  enregistrement text not null,
  depart text not null,
  arrivee text not null,
  fermeture_enregistrement text
);

create table familles_tarifaires (
  code text primary key check (code in ('ECO', 'VIP')),
  id text not null unique,
  rang integer not null,
  nom text not null,
  modifiable boolean not null,
  remboursable boolean not null,
  frais_modif integer check (frais_modif >= 0),
  delai_modif_h integer check (delai_modif_h >= 0),
  avantages jsonb not null default '[]'::jsonb
);

create table grille_paliers (
  famille_code text not null references familles_tarifaires (code),
  rang integer not null check (rang >= 1),
  prix_adulte integer not null check (prix_adulte >= 0),
  prix_enfant integer not null check (prix_enfant >= 0),
  prix_bebe integer not null check (prix_bebe >= 0),
  quota integer check (quota >= 0),
  primary key (famille_code, rang)
);

create table options_catalogue (
  code text primary key,
  rang integer not null,
  libelle text not null,
  detail text not null,
  prix integer not null check (prix >= 0),
  familles jsonb not null,
  quantite_max integer not null check (quantite_max >= 1)
);

create table agences (
  id text primary key,
  rang integer not null,
  ville text not null,
  telephones jsonb not null default '[]'::jsonb
);

create table infos_trafic (
  id text primary key,
  message text not null,
  lien text,
  libelle_lien text,
  niveau text not null check (niveau in ('information', 'alerte')),
  debut_at timestamptz not null,
  fin_at timestamptz not null,
  actif boolean not null default true
);

-- Paramètres réglables (configuration commerciale, paramètres de gestion…), en JSON.
create table parametres (
  cle text primary key,
  valeur jsonb not null
);

-- Exploitation -------------------------------------------------------------

create table traversees (
  id text primary key,
  ligne_id text not null references lignes (id),
  navire_id text not null references navires (id),
  terminal_depart_id text not null references terminaux (id),
  terminal_arrivee_id text not null references terminaux (id),
  depart_at timestamptz not null,
  arrivee_at timestamptz not null,
  enregistrement_ouverture_at timestamptz not null,
  enregistrement_fermeture_at timestamptz,
  statut text not null check (statut in ('programmee', 'ouverte', 'fermee', 'annulee', 'partie')),
  capacite_vendable integer not null check (capacite_vendable >= 0),
  check (arrivee_at > depart_at)
);

create index traversees_depart on traversees (depart_at);

-- Paliers de prix d'une traversée. « ouverte » est l'état de départ ; les ouvertures et
-- fermetures manuelles sont dans changements_paliers (le dernier changement l'emporte).
create table classes_reservation (
  id text primary key,
  traversee_id text not null references traversees (id) on delete cascade,
  famille_code text not null references familles_tarifaires (code),
  rang integer not null check (rang >= 1),
  prix_adulte integer not null check (prix_adulte >= 0),
  prix_enfant integer not null check (prix_enfant >= 0),
  prix_bebe integer not null check (prix_bebe >= 0),
  quota integer check (quota >= 0),
  ouverte boolean not null default true,
  unique (traversee_id, famille_code, rang)
);

create table changements_paliers (
  id text primary key,
  traversee_id text not null references traversees (id) on delete cascade,
  classe_id text not null references classes_reservation (id) on delete cascade,
  ouverte boolean not null,
  motif text not null check (length(trim(motif)) > 0),
  auteur text not null,
  le timestamptz not null
);

create index changements_paliers_traversee on changements_paliers (traversee_id, le);

-- Ventes -------------------------------------------------------------------

create table commandes (
  id text primary key,
  telephone text,
  email text,
  statut text not null check (statut in ('en-cours', 'payee', 'abandonnee', 'expiree')),
  total integer not null check (total >= 0),
  numero_facture text unique,
  facture_emise_le timestamptz,
  client_id text,
  cree_le timestamptz not null
);

create table reservations (
  id text primary key,
  commande_id text references commandes (id) on delete set null,
  -- Ordre dans la commande : 0 = aller, 1 = retour.
  rang_commande integer not null default 0,
  reference text not null default '',
  traversee_id text not null references traversees (id),
  famille_code text not null references familles_tarifaires (code),
  classe_id text not null references classes_reservation (id),
  statut text not null check (statut in ('brouillon', 'bloquee', 'payee', 'emise', 'expiree', 'annulee', 'remboursee', 'embarquee', 'absente')),
  telephone text,
  email text,
  prix_adulte integer not null check (prix_adulte >= 0),
  prix_enfant integer not null check (prix_enfant >= 0),
  prix_bebe integer not null check (prix_bebe >= 0),
  total integer not null check (total >= 0),
  devise text not null default 'XAF' check (devise = 'XAF'),
  bloquee_jusqu_a timestamptz,
  canal text not null check (canal in ('web', 'agence', 'telephone')),
  moyen_paiement text check (moyen_paiement in ('airtel', 'moov', 'especes')),
  cree_le timestamptz not null,
  -- Ventes d'exemple de la démo (rechargeables) ; les vraies réservations sont à false.
  exemple boolean not null default false
);

create unique index reservations_reference on reservations (reference) where reference <> '';
create index reservations_traversee on reservations (traversee_id);
create index reservations_commande on reservations (commande_id);

create table passagers (
  reservation_id text not null references reservations (id) on delete cascade,
  id text not null,
  rang integer not null,
  categorie text not null check (categorie in ('adulte', 'enfant', 'bebe')),
  nom text not null,
  prenom text not null,
  date_naissance date,
  type_piece text check (type_piece in ('cni', 'passeport', 'carte-sejour')),
  numero_piece text,
  primary key (reservation_id, id)
);

create table reservation_options (
  reservation_id text not null references reservations (id) on delete cascade,
  code text not null references options_catalogue (code),
  quantite integer not null check (quantite >= 1),
  prix_unitaire integer not null check (prix_unitaire >= 0),
  primary key (reservation_id, code)
);

create table paiements (
  id text primary key,
  commande_id text not null references commandes (id) on delete cascade,
  moyen text not null check (moyen in ('airtel', 'moov')),
  numero text not null,
  montant integer not null check (montant >= 0),
  statut text not null check (statut in ('en-attente', 'reussi', 'refuse', 'rembourse')),
  ref_transaction text not null unique,
  ref_operateur text,
  cree_le timestamptz not null,
  maj_le timestamptz not null
);

create index paiements_commande on paiements (commande_id);

-- Numéro de facture sans trou : la ligne de l'année est verrouillée pendant la transaction.
create table compteurs_factures (
  annee integer primary key,
  dernier integer not null default 0 check (dernier >= 0)
);

create table envois (
  id text primary key,
  commande_id text references commandes (id) on delete cascade,
  client_id text,
  canal text not null check (canal in ('email', 'sms', 'whatsapp')),
  destinataire text not null,
  objet text not null,
  texte text not null,
  pieces jsonb not null default '[]'::jsonb,
  statut text not null check (statut in ('apercu', 'envoye', 'echec')),
  tentatives integer not null default 0,
  erreur text,
  cree_le timestamptz not null
);

-- Embarquement -------------------------------------------------------------

create table embarquements (
  id text primary key,
  traversee_id text not null references traversees (id) on delete cascade,
  reservation_id text not null,
  passager_id text not null,
  reference text not null,
  mode text not null check (mode in ('scan', 'manuel')),
  agent text not null,
  embarque_le timestamptz not null,
  -- Deux appareils ne peuvent pas faire monter deux fois le même passager.
  unique (traversee_id, passager_id),
  foreign key (reservation_id, passager_id) references passagers (reservation_id, id) on delete cascade
);

create table scans_embarquement (
  id text primary key,
  traversee_id text not null references traversees (id) on delete cascade,
  reference text,
  resultat text not null check (resultat in ('valide', 'deja-scanne', 'autre-traversee', 'non-valable', 'invalide', 'embarquement-clos')),
  mode text not null check (mode in ('scan', 'manuel')),
  agent text not null,
  le timestamptz not null
);

create index scans_embarquement_traversee on scans_embarquement (traversee_id, le);

create table clotures_embarquement (
  traversee_id text primary key references traversees (id) on delete cascade,
  agent text not null,
  le timestamptz not null
);

-- Sécurité : RLS sur toutes les tables, aucune règle d'accès (lecture et écriture par le serveur seulement).

alter table ports enable row level security;
alter table terminaux enable row level security;
alter table navires enable row level security;
alter table lignes enable row level security;
alter table regles_programme enable row level security;
alter table familles_tarifaires enable row level security;
alter table grille_paliers enable row level security;
alter table options_catalogue enable row level security;
alter table agences enable row level security;
alter table infos_trafic enable row level security;
alter table parametres enable row level security;
alter table traversees enable row level security;
alter table classes_reservation enable row level security;
alter table changements_paliers enable row level security;
alter table commandes enable row level security;
alter table reservations enable row level security;
alter table passagers enable row level security;
alter table reservation_options enable row level security;
alter table paiements enable row level security;
alter table compteurs_factures enable row level security;
alter table envois enable row level security;
alter table embarquements enable row level security;
alter table scans_embarquement enable row level security;
alter table clotures_embarquement enable row level security;
`
