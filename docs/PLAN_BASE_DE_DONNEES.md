# Plan — brancher l'application sur la base Supabase

Rédigé le 22 novembre 2026, validé le 23 novembre avec les choix recommandés (une seule base, exemples conservés, bibliothèques ajoutées, rôles proposés).

## Point de départ

- Base Supabase `logimar-241` (organisation « LOGIMAR 241 », offre gratuite, région Paris `eu-west-3`), vide. Data API active, aucun accès automatique aux nouvelles tables, RLS automatique sur les nouvelles tables.
- Reliée au projet Vercel `logimar-demo` par l'intégration officielle : les variables `POSTGRES_*`, `SUPABASE_*` et `NEXT_PUBLIC_SUPABASE_*` sont synchronisées par Supabase (Production, Preview, Development). Ne jamais les recopier à la main ni les committer.
- L'application garde aujourd'hui toutes ses données dans le navigateur (`DemoRepository`, clé `logimar-demo:v3:donnees`) et fait tourner ses services dans le navigateur. Conséquences : un scan fait sur un téléphone n'apparaît pas sur l'ordinateur, les prix et les places sont calculés côté client, la gestion est protégée par un simple code (`241241`).

## Objectifs

1. **Données partagées** entre tous les appareils : réservations, paliers, embarquements, manifeste.
2. **Prix, places, blocage et numéro de facture calculés côté serveur, dans une transaction** (cahier des charges gestion §5) : jamais deux fois la même place, jamais un prix venu du navigateur.
3. **Vrais comptes de gestion avec des rôles** à la place du code de démonstration ; c'est à ce moment-là que le fondateur reçoit son compte.
4. **Écrans inchangés** : on remplace ce qu'il y a derrière les interfaces, pas les écrans.

## Principes

- **Tout passe par le serveur.** Le navigateur n'accède jamais directement aux tables. Les écrans appellent des actions serveur de Next.js (`"use server"`), qui appellent les services existants (`ServiceReservation`, `ServiceGestion`, `ServiceEmbarquement`, `ServiceBillets`), qui utilisent un `PostgresRepository` côté serveur. RLS activée sur toutes les tables **sans aucune règle d'accès anonyme** : la clé publique ne permet de rien lire.
- **Le calcul des prix reste dans `domain/`** (fonctions pures testées). La transaction verrouille la traversée (`SELECT … FOR UPDATE`), relit l'occupation, appelle `meilleureOffre`, enregistre la réservation, puis valide. Pour cela, connexion PostgreSQL directe côté serveur (bibliothèque `postgres`, par le pooler de Supabase), car le client Supabase ne gère pas les transactions.
- **Un seul aiguillage** : `services/index.ts` choisit `PostgresRepository` quand les variables Supabase sont présentes, sinon `DemoRepository`. Le mode démo reste disponible pour le développement local et les tests.
- **Migrations SQL versionnées** dans `services/serveur/migrations/` (une par fichier, numérotées), relues dans la PR comme le reste du code, appliquées une seule fois chacune (table `schema_migrations`).
- **Aucune valeur d'exemple dans le code des écrans** : les exemples restent dans `data/seed/` et sont chargés en base par une action réservée à l'administrateur, chaque ligne marquée `exemple = true`.

## Schéma (première version)

Inspiré du modèle des deux cahiers des charges (réservation §7, gestion §4), adapté à deux tarifs Éco et VIP.

| Domaine | Tables |
|---|---|
| Référentiel | `ports`, `terminaux`, `navires`, `lignes`, `regles_programme`, `familles_tarifaires`, `grille_paliers`, `options`, `parametres` (configuration et paramètres de gestion), `infos_trafic`, `agences` |
| Exploitation | `traversees` (générées depuis le programme), `classes_reservation` (paliers par traversée : prix, quota, ouvert), `changements_paliers` (auteur = utilisateur connecté, motif) |
| Ventes | `commandes`, `reservations` (statut, `bloquee_jusqu_a`, canal, `exemple`), `passagers`, `reservation_options`, `paiements`, `factures` + `compteurs_factures` (numéro sans trou, verrouillé dans la transaction), `envois` |
| Embarquement | `embarquements` (contrainte unique traversée + passager : deux téléphones ne peuvent pas faire monter deux fois le même passager), `scans_embarquement`, `clotures_embarquement` |
| Gestion | `profils` (lien vers le compte Supabase Auth, nom, rôle, actif), `journal_audit` (qui, quand, avant, après, motif) |
| Plus tard | `clients`, `passagers_enregistres`, `codes_verification` (comptes clients), `instantanes_traversee` (photo nocturne de chaque traversée, cahier des charges gestion §4), règles de yield |

Les textes du site (aide, mentions, société) restent dans `data/seed/` pour l'instant.

## Étapes (une PR chacune, relue sur la Preview)

| Étape | Contenu | Ce qu'on voit sur la Preview |
|---|---|---|
| **A. Fondations** | Dépendances, migration du schéma et de la RLS, connexion serveur, `PostgresRepository` complet sauf comptes clients (lectures et écritures, testé sur PGlite contre la démo), chargement des données d'exemple, page de contrôle réservée à la Preview (`/preview/base`). Le site ne change pas encore : il passe sur la base à l'étape B. | Sur la page de contrôle : migrations appliquées, données chargées, base et démo identiques. |
| **B. Parcours client** | Actions serveur pour la recherche, le blocage (transaction), le paiement simulé et sa confirmation, les billets, « Mes billets » (recherche par référence + contact côté serveur), la facture numérotée. | Une réservation faite sur un téléphone est visible depuis l'ordinateur. |
| **C. Comptes de gestion** | Supabase Auth (e-mail + mot de passe, double facteur ensuite pour l'administrateur), table `profils`, invitation d'un utilisateur par l'administrateur, protection de `/admin` et `/scan` côté serveur (fichier `proxy.ts` de Next.js 16), droits par rôle, journal d'audit des paliers. Le code `241241` ne sert plus qu'en mode démo local. **Création du compte du fondateur.** | Connexion avec un vrai compte ; un agent d'embarquement n'a accès qu'à `/scan`. |
| **D. Back-office et embarquement** | Indicateurs calculés côté serveur, paliers enregistrés en base avec leur auteur, embarquement sur plusieurs téléphones sans doublon, clôture, manifeste de bord partagé. | Un scan sur le téléphone apparaît au manifeste sur l'ordinateur (relecture toutes les 30 s, déjà en place). |
| **E. Tâches planifiées** | Tâche quotidienne (Vercel Cron) : génération des traversées à venir, instantané nocturne, nettoyage des blocages expirés ; elle garde aussi la base active (l'offre gratuite met en pause un projet inactif depuis 7 jours). | Rien de visible ; la base reste disponible. |

Ordre proposé : A, B, C, D, E. Si le fondateur doit avoir son compte plus tôt, C peut passer juste après A.

Chaque étape : lint, tests, build, vérification dans le navigateur (téléphone et ordinateur), passation à jour.

## Ce qui reste simulé

- **Paiement** Airtel Money et Moov Money (`SimulatedProvider`). Sur Vercel, une fonction serveur ne peut pas attendre 4 s puis rappeler toute seule : la confirmation simulée sera donnée au moment où l'écran de paiement redemande l'état du paiement.
- **E-mails et SMS** : toujours l'aperçu `/apercu-email/[id]`.
- **Comptes clients** : restent sur l'appareil jusqu'à une étape ultérieure.
- **Hors ligne** (PWA) pour l'application de scan : plus tard.

## Décisions à prendre

1. **Une seule base pour la Preview et la production.** L'offre gratuite limite à deux projets actifs (tu en as deux : Data_RootsMap et logimar-241). Conséquence : une réservation de test faite sur une Preview apparaît aussi en production. L'alternative (une base par environnement, ou les branches Supabase) demande l'offre Pro de Supabase, payante.
2. **Données d'exemple dans la base partagée** : garder les ventes d'exemple (marquées) pour que le tableau de bord reste parlant, avec un bouton « Recharger les données d'exemple » réservé à l'administrateur. Ou démarrer vide.
3. **Application des migrations** : décidé le 23/11/2026, par la page `/preview/base`, qui n'existe que sur les Previews (protégées par la connexion Vercel) : bouton « Appliquer les migrations », utilisé après la relecture de la PR. Même page pour charger les données d'exemple (environ 5 000 lignes, impossibles à coller dans l'éditeur SQL de Supabase).
4. **Dépendances** : `postgres` (licence Unlicense) ajoutée à l'étape A, `@electric-sql/pglite` (Apache-2.0, tests seulement : un vrai PostgreSQL dans les tests) ; `@supabase/supabase-js` et `@supabase/ssr` (licence MIT) à l'étape C pour les comptes.
5. **Rôles de l'étape C** : proposés Administrateur (toi, le fondateur), Direction (lecture seule), Revenue manager (paliers), Agent d'embarquement (scan). Agent de vente, Exploitation et Comptabilité viendront avec leurs écrans.
6. **Sauvegardes** : le cahier des charges demande une sauvegarde quotidienne. L'offre gratuite n'en garantit pas (à vérifier sur la page des prix de Supabase). Pour la vraie production : offre Pro, ou export quotidien automatique vers un stockage choisi par LOGIMAR.
7. **Données personnelles** (pièces d'identité des passagers) : hébergées à Paris, dans l'Union européenne. LOGIMAR doit vérifier les obligations gabonaises (déclaration, transfert hors du Gabon, durée de conservation), comme le prévoit le cahier des charges gestion §5.

## Pour le développement local

Les variables de la base ne sont pas sur le poste de développement. Quand il faudra tester contre la base en local, l'utilisateur lance lui-même `vercel env pull .env.local` (fichier ignoré par git) ; je n'en lis pas les valeurs. Sans ce fichier, l'application tourne en mode démo, comme aujourd'hui.
