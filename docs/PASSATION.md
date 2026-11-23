# Passation — démonstration LOGIMAR 241

État au 23 novembre 2026 (étape 7A fusionnée ; étape 7B, parcours client sur la base, en PR et active sur la Preview seulement ; la production reste sur la démo du navigateur). Pour reprendre dans une nouvelle conversation : `docs/PROMPT_REPRISE.md`.

## Où sont les choses

- Dépôt GitHub : `ten-mukass/LOGIMAR_DEMO`. Copie locale : `~/Developer/LOGIMAR_DEMO`, branche de travail `demo-v1`.
- Vercel : projet `logimar-demo` ; production = `main` (logimar-demo.vercel.app) ; chaque push sur `demo-v1` crée une Preview (protégée par la connexion Vercel), à l'adresse fixe https://logimar-demo-git-demo-v1-mukass-projects.vercel.app.
- Supabase (créé le 22/11/2026) : organisation « LOGIMAR 241 » (offre gratuite, dédiée au projet), projet `logimar-241`, région Paris `eu-west-3`, console https://supabase.com/dashboard/project/ogrhxwlvwkrahtsbpbuo ; schéma et données d'exemple chargés (étape 7A), pas encore utilisé par le site. Relié à Vercel par l'intégration officielle, limitée au projet `logimar-demo` : les variables `POSTGRES_*`, `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*` sont synchronisées automatiquement (ne jamais les recopier ni les committer). Synchronisées vers Production et Preview (Preview activé le 23/11/2026 : Supabase > projet > Settings > Integrations > connexion Vercel > Edit) ; une Preview ne les reçoit qu'à son prochain déploiement. Mot de passe de la base : chez l'utilisateur.
- Spécifications : `docs/` (`PERIMETRE_DEMO.md` fait foi). Plan validé et décisions par défaut : `docs/PLAN_DEMO.md`.
- Serveur de développement : configuration `~/Developer/.claude/launch.json`, nom `logimar-dev`, port 3241 (à lancer avec l'outil de prévisualisation du navigateur intégré). L'outil lit `.claude/launch.json` dans le dossier de départ de la session : copier ce fichier là si la session n'a pas démarré dans `~/Developer`.

## Avancement

| Étape | Contenu | État |
|---|---|---|
| 0 | Remise au vert du déploiement | Fusionnée (PR #1) |
| 1 | Fondations, Accueil, Horaires | Fusionnée (PR #2), en production |
| 2 | Parcours aller simple jusqu'au billet | Fusionnée (PR #3), en production |
| 3 | Aller-retour, PDF, e-mails, Mes billets, compte, Aide | Fusionnée (PR #4, `ab4d1fd`), en production |
| 4 | Back-office | Fusionnée (PR #5), en production ; correctif du billet PDF fusionné à part (PR #6) |
| 5 | Embarquement : scan du QR, manifeste de bord | Fusionnée (PR #7), en production ; décodeur jsQR (iPhone) fusionné à part (PR #8) |
| 5 bis | Back-office : menu latéral réductible (demandé le 22/11/2026) | Fusionnée (PR #9), en production |
| 5 ter | Deux tarifs, Éco et VIP (décision du fondateur, 22/11/2026) | Fusionnée (PR #10), en production |
| 6 | Recette | À faire |
| 7 | Brancher l'application sur la base Supabase | Plan validé (`docs/PLAN_BASE_DE_DONNEES.md`) ; étape A (fondations) fusionnée (PR #11, `499b377`), en production : schéma, `PostgresRepository`, page `/preview/base`. Étape B (parcours client sur la base) : PR ouverte le 23/11/2026, active sur la Preview seulement. Base Supabase : migration 0001 appliquée et données d'exemple chargées le 23/11/2026 (80 traversées, 480 paliers, 4 005 ventes, 8 026 passagers ; identiques à la démo) ; migration 0002 (retrait des droits publics) appliquée le 23/11/2026 : 0 table sans RLS, 0 règle d'accès, 0 droit pour `anon` et `authenticated`. Étapes B à E à faire |

### Étape 3 : contenu

- Modèle `Commande` (aller simple ou aller-retour, un paiement, une facture numérotée sans trou `F-2026-000001`), `Envoi`, `Client`, `CodeVerification`.
- Résultats en deux temps pour l'aller-retour (URL : `t`/`f` = aller, `tr`/`fr` = retour) ; Passagers et Paiement adaptés.
- Billet et facture en PDF (`services/documents/pdf.ts`, chargé à la demande), marqués « démonstration ».
- `NotificationService` + `PreviewNotificationService` + page `/apercu-email/[id]`.
- `AuthService` + `LocalAuthService` ; écran `/compte` (connexion, mot de passe oublié, code, billets, factures, passagers enregistrés, suppression) ; création du compte depuis le billet.
- `ServiceBillets` ; écran `/mes-billets` (recherche référence + contact, billets de l'appareil, billet d'exemple pour la démo) ; un billet ne s'affiche que s'il est consultable sur l'appareil.
- Passagers : contact et fiches pré-remplis depuis le compte connecté ; les passagers saisis rejoignent le compte.
- Page `/aide` construite depuis `data/seed/aide.ts`, numéros des agences.
- Vérifié dans le navigateur (390 px, tablette, ordinateur) : aller-retour complet, PDF générés, aperçu des e-mails, création et vérification du compte, Mes billets, Aide ; console sans erreur. 104 tests, lint et build OK.
- Non fait : billet consultable hors ligne (PWA).

### Étape 4 : contenu

- Accès `/admin` par un code de démonstration (`data/seed/gestion.ts`, `241241`), session de 8 h dans le navigateur. `AccesGestion` → `CodeDemoAccesGestion` ; production : comptes, rôles, double facteur.
- Le back-office a sa propre navigation (l'en-tête et la navigation du site sont masqués sous `/admin`) ; écrans pour ordinateur, utilisables sur tablette (tableaux défilants).
- **Menu latéral** (`components/gestion/menu-gestion.tsx`, ajouté le 22/11/2026) : à partir de 1024 px, menu fixé à gauche, réductible à ses icônes (infobulle au survol et au focus) ; le choix est retenu dans le navigateur (`logimar-demo:v2:menu-gestion`). En dessous de 1024 px : barre du haut avec un bouton qui fait glisser le menu depuis la gauche (`<dialog>` : Échap, clic à côté, focus rendu au bouton). Le bandeau « Version de démonstration » est placé à côté du menu dans la gestion et l'embarquement. Variable CSS `--menu` = largeur du menu, pour les éléments calés sur la largeur de l'écran (détail d'une réservation). En développement, l'indicateur de Next.js est déplacé en bas à droite (`next.config.ts`) pour ne pas couvrir le bas du menu.
- **Tableau de bord** (`/admin`) : remplissage, recette billets (et options), recette par siège offert, recette par passager, pick-up 7 j, rythme de réservation (places par jour, 30 j), répartition par tarif, par canal et par moyen de paiement, prochaines traversées (palier en vente par famille, écart à la référence, alertes), dernières réservations. Filtres mois et sens.
- **Traversées** (`/admin/traversees`) et **fiche traversée** (`/admin/traversees/[id]`) : paliers (prix, quota, occupées, restantes, état en vente / en attente / épuisé / fermé), bouton Fermer / Ouvrir avec motif obligatoire, historique des changements, courbe J-30 → J0 contre la moyenne des traversées parties du même sens (au moins 3), lien « Voir côté client ». Le dernier palier VIP (ex-Flex) ne se ferme pas (cahier des charges §3.3).
- Les fermetures de paliers sont stockées dans `logimar-demo:v3:donnees` (`changementsPaliers`) et appliquées par `DemoRepository.listerInventaires` : le prix change aussitôt sur le site (vérifié : 28 000 → 31 000 F en Éco le 20 nov., puis retour).
- **Réservations** (`/admin/reservations`) : recherche (référence, nom sans accent, téléphone, e-mail), filtres traversée, statut, canal, origine (« Ce navigateur »), détail dépliable, 50 par page.
- **Manifeste** (`/admin/traversees/[id]/manifeste`) : passagers payés par ordre alphabétique, pièces, statut d'embarquement ; impression et export CSV (séparateur « ; », pour Excel).
- Calculs en fonctions pures testées : `domain/indicateurs.ts`, `domain/paliers.ts`, `domain/manifeste.ts` ; synthèse par traversée dans `services/gestion/service-gestion.ts`. `Repository.listerReservations` renvoie exactement les réservations qui composent l'occupation (testé sur les 80 traversées).
- Vérifié dans le navigateur (1440 px et tablette 768 px) : connexion, tableau de bord, filtres, fiche, fermeture et réouverture d'un palier, réservation faite sur le site visible au back-office et au manifeste ; console sans erreur. 139 tests, lint et build OK.
- Non fait (hors périmètre de la démo) : calendrier mensuel, modification du prix ou du quota d'un palier, éditeur de grille, règles et simulation, paiements et rapprochement, ventes en agence, export Excel natif.

### Étape 5 : contenu (embarquement, demandé le 18/11/2026)

Besoin : le contrôleur scanne le QR du billet, le passager monte si le scan est validé, le billet n'est plus valable ensuite, et le **manifeste de bord** (personnes réellement à bord) se remplit au fil des scans ; la liste des billets payés est une liste distincte. Plan détaillé : `docs/PLAN_DEMO.md`, « Étape 5 ».

- Écran **`/scan`** (mobile d'abord, même code d'accès que la gestion, lien « Embarquement » dans la gestion et sur la fiche traversée) : choix de la traversée (celles du jour, puis les prochaines), compteur « N à bord sur M attendus », scan par la caméra, photo du QR, recherche manuelle (référence, nom, téléphone, e-mail), journal des derniers contrôles, clôture et réouverture.
- **Contrôle** (`domain/embarquement.ts`, fonctions pures testées) : signature du QR (`verifierQrBillet`), billet payé, bonne traversée, pas déjà utilisé, embarquement non clos. Résultats : valide, déjà scanné (avec l'heure du premier passage), autre traversée, non valable, refusé (falsifié, illisible, inconnu), embarquement clos.
- **Billet utilisé une fois** : un scan valide fait monter tout de suite tous les passagers du billet ; le scan suivant donne « déjà utilisé ». « Retirer du bord » corrige une erreur passager par passager. La caméra ignore le même QR pendant 5 s (elle le voit plusieurs fois par seconde).
- **Données** : `Embarquement` (un par passager à bord), `ScanEmbarquement` (journal), `ClotureEmbarquement` ; stockés dans `logimar-demo:v3:donnees` ; `Repository` : `listerEmbarquements`, `enregistrerEmbarquements` (sans doublon), `supprimerEmbarquement`, `listerScans`, `enregistrerScan`, `getClotureEmbarquement`, `definirClotureEmbarquement`. Service : `services/embarquement/service-embarquement.ts`.
- **Back-office** (`/admin/traversees/[id]/manifeste`) : onglet **Manifeste de bord** (passagers scannés, ordre et heure de passage, mode de contrôle) et onglet **Billets vendus** (passagers payés : à embarquer, embarqué, absent après clôture) ; export CSV et impression des deux ; mise à jour automatique quand un scan est fait dans un autre onglet.
- **Billet du client** : tampon « Billet utilisé » et QR grisé une fois tous ses passagers embarqués.
- **Démonstration sur un seul appareil** : panneau « Démonstration : simuler un scan » (billets de l'appareil, billet d'exemple, billet falsifié, billet d'une autre traversée) ; le QR est fabriqué comme sur le billet du client et passe par le même contrôle.
- Vérifié dans le navigateur (téléphone 375 px, tablette, ordinateur) : scan valide, second scan refusé, falsifié refusé, autre traversée, billet de groupe (4 passagers), contrôle manuel, clôture (absents) et réouverture, manifeste de bord et billets vendus, tampon sur le billet du client ; console sans erreur. 158 tests, lint et build OK.
- **Non vérifié** : la caméra elle-même (pas de caméra dans le navigateur intégré) ; à essayer sur un téléphone Android et sur un iPhone, sur la Preview (https).
- **Lecture du QR** (`lib/lecture-qr.ts`) : lecteur intégré au navigateur (`BarcodeDetector`) quand il existe (Chrome et Edge sur Android, Chrome sur ordinateur), sinon décodeur `jsqr` 1.4.0 (Apache-2.0, ajouté le 18/11/2026 avec l'accord de l'utilisateur, chargé à la demande) : Safari sur iPhone, Firefox. Vérifié : tests de décodage d'un QR de billet dessiné comme sur le billet (fond blanc, fond gris décalé, image → passage à bord) et, dans le navigateur avec le lecteur intégré masqué, photo du QR réel d'un billet décodée par jsQR puis contrôlée.

### Tarifs Éco et VIP (22/11/2026)

- Décision du fondateur : deux familles seulement. `CodeFamille` = `"ECO" | "VIP"` ; le Standard est retiré partout (site client, back-office, options, ventes d'exemple, tests).
- Le VIP reprend l'ancien Flex : mêmes sièges que l'Éco, modifiable sans frais, remboursable, embarquement prioritaire, sans quota propre et toujours vendable (son dernier palier ne se ferme pas). L'Éco est inchangé ; la garantie modification n'est proposée qu'avec l'Éco.
- Grille d'exemple (`data/seed/tarifs.ts`) : Éco en 5 paliers de 30 places (25 000, 28 000, 31 000, 35 000, 39 000 F l'adulte), VIP 55 000 F. Ventes d'exemple : 85 % Éco, 15 % VIP.
- Clé des données du navigateur passée en `logimar-demo:v3:donnees` : les réservations et réglages enregistrés avant le changement (avec Standard ou Flex) sont abandonnés. La session de gestion et la préférence du menu sont conservées.
- Cahiers des charges : une note en tête signale la décision ; leur texte n'a pas été réécrit.

### Étape 7A : fondations de la base (fusionnée le 23/11/2026, PR #11)

- `services/serveur/` (côté serveur uniquement) : `sql.ts` (interface `Sql` : requête paramétrée, script, transaction), `connexion.ts` (bibliothèque `postgres` sur `POSTGRES_URL`, pooler Supabase en mode transaction donc `prepare: false`, SSL), `sql-pglite.ts` (PGlite, tests seulement), `migrations.ts` + `migrations/0001-schema-initial.ts`, `exemples.ts` (chargement depuis `data/seed/`), `controle.ts` (état et comparaison avec la démo).
- Schéma : référentiel (avec `rang` pour garder l'ordre de `data/seed/`), traversées, paliers, changements de paliers, commandes, réservations (`exemple` = vente d'exemple), passagers, options, paiements, compteurs de factures (numéro sans trou), envois, embarquements (unique traversée + passager), scans, clôtures. RLS sur toutes les tables sans aucune règle : la clé publique ne lit rien.
- `services/repository/postgres-repository.ts` : même interface et mêmes règles que `DemoRepository` (vraies réservations d'abord, ventes d'exemple ensuite, palier fermé au moment de l'achat). Comptes clients : pas encore (renvoie « absent » ou une erreur claire). Côté serveur, `listerReservationsLocales` renvoie les vraies réservations.
- Tests (`postgres-repository.test.ts`, PGlite) : le schéma s'applique une fois, RLS partout, et la base montre exactement ce que montre la démo (référentiel, traversées, inventaires de toutes les traversées à trois dates, réservations retenues, répartition, fermeture de palier), plus les écritures (réservation, embarquement sans doublon, commande, facture sans trou, paiement, envoi, scans, clôture, rechargement des exemples).
- Page `/preview/base` : n'existe que si `VERCEL_ENV = preview` (ou en développement local) ; ailleurs, 404. Boutons « Appliquer les migrations » et « Charger les données d'exemple » (actions serveur qui refusent hors Preview).
- Migration 0002 : retire les droits que Supabase accorde par défaut aux rôles `anon` et `authenticated` (vérifié le 23/11/2026 : 150 droits, sans effet grâce à la RLS sans règle, mais retirés par précaution). Appliquée le 23/11/2026 ; contrôle dans l'éditeur SQL : 0 droit restant, y compris par défaut sur les futures tables.
- Appliquer une migration (après relecture de la PR et accord de l'utilisateur) : sur la Preview, `/preview/base`, bouton « Appliquer les migrations ». Contrôle de sécurité, en lecture seule, dans l'éditeur SQL de Supabase : nombre de tables `public` sans RLS (`pg_class.relrowsecurity`), de règles (`pg_policies`), de droits de `anon` et `authenticated` (`information_schema.role_table_grants`) et de droits par défaut (`pg_default_acl`) ; les quatre valent 0 le 23/11/2026.
- Le site n'utilise pas encore la base : c'est l'étape B.

### Étape 7B : parcours client sur la base (PR ouverte le 23/11/2026)

Décision du 23/11/2026 : **active sur la Preview seulement**. La production garde la démo du navigateur jusqu'aux étapes C (comptes de gestion) et D (back-office et scan sur la base) : sinon le back-office et le scan, restés dans le navigateur, ne verraient plus les réservations du site, et brancher le back-office sur la base derrière le code `241241` exposerait les données des passagers.

- **Aiguillage** (`services/mode-donnees.ts`, fixé au build par `next.config.ts`) : `NEXT_PUBLIC_LOGIMAR_DONNEES = "base"` si `POSTGRES_URL` existe et que `VERCEL_ENV` n'est pas `production` (Preview, ou poste local avec `.env.local`), sinon `"demo"`. Seul ce mot est inscrit dans le code. Les actions serveur refusent tout en mode démo.
- **Actions serveur** (`services/serveur/actions-site.ts`, seules portes du navigateur vers la base, entrées vérifiées) : référentiel, infos trafic, traversées, inventaires, répartition par tarif, billet d'exemple ; blocage, lecture de commande, abandon, demande de paiement, suivi du paiement ; lecture par identifiant des réservations, commandes, paiements, e-mails ; recherche « Mes billets » ; rattachement d'une commande à un compte client. L'heure est celle du serveur. Services serveur : `services/serveur/services.ts`.
- **Transactions** : `Repository.transaction(verrous, travail)`. Blocage : traversées verrouillées (`select … for update`, dans l'ordre des identifiants), places relues puis enregistrées. Émission : paiement verrouillé et relu, billets, références et numéro de facture dans la même transaction (deux relectures simultanées n'émettent qu'une fois). `DemoRepository` : exécution directe. Corrigé au passage : la commande est enregistrée avant ses réservations (clé étrangère en base).
- **Paiement simulé serveur** (`SimulatedProviderServeur`) : sans état ni minuterie ; l'issue se déduit du paiement en base quand l'écran redemande l'état (validé 4 s après la demande, refusé si le numéro finit par `0000`).
- **Accès aux billets** : le serveur ne rend rien sur la seule référence. L'appareil garde les identifiants (aléatoires) des réservations qu'il a faites ou retrouvées (`logimar-demo:v1:reservations-base`) ; un autre appareil passe par « Mes billets » (référence + téléphone ou e-mail, même message d'échec dans tous les cas). Pas de migration : l'identifiant de la réservation sert de clé (le jeton dédié proposé au départ n'a pas été nécessaire ; à revoir pour la production).
- **Navigateur** : `RepositoryDistant` (lectures par actions serveur, écritures directes refusées, comptes clients et codes sur l'appareil) et `ServiceReservationDistant`. Écrans inchangés. `repositoryGestion` (démo du navigateur) sert au back-office et au scan.
- **Mémoire serveur** : référentiel 5 min (dans `PostgresRepository`), répartition par tarif 1 min.
- Tests : `services/serveur/parcours-serveur.test.ts` (PGlite : blocage, dernières places demandées en même temps, paiement, double confirmation, factures sans trou, refus `0000`, expiration, recherche de billet), `services/repository/repository-distant.test.ts`. 189 tests, lint et build OK.
- Vérifié sur la Preview le 23/11/2026 : réservation au format téléphone (LGM-DVNS5, `essai@example.com`, 27 nov., facture F-2026-000001), puis au format ordinateur, mémoire de l'appareil effacée : billet refusé sur la seule référence, refusé avec un mauvais contact, affiché avec l'e-mail de la réservation ; aperçu de l'e-mail lu depuis la base. En local (sans base), parcours complet en mode démo inchangé. Cette réservation d'essai reste dans la base partagée (1 place le 27 nov.).
- **Région des fonctions** : d'abord lentes (environ 330 ms par lecture, 4 s pour le blocage, 5 s pour l'émission) car les fonctions Vercel tournaient loin de la base. Le 23/11/2026, avec l'accord de l'utilisateur, `vercel.json` fixe la région à Paris (`cdg1`, comme la base `eu-west-3`) ; s'applique aussi à la production. Mesuré ensuite sur la Preview : appels de 60 à 300 ms, blocage en moins de 3 s pour toute l'action, billet affiché environ 4,3 s après « Payer » (dont 4 s de paiement simulé), page du billet en environ 1 s. Seconde réservation d'essai : LGM-LD9JZ (29 nov.).
- **Non fait / reporté** : back-office, manifeste et scan sur la base (étape D ; le billet du client n'affiche pas le tampon « utilisé » en mode base) ; comptes clients sur la base ; signature des QR côté serveur (étape D) ; limitation du nombre d'essais de « Mes billets ».

## Méthode de travail (validée)

- Une PR par étape depuis `demo-v1` ; l'utilisateur relit la Preview et fusionne par *merge commit*. **Ne jamais pousser l'étape suivante tant que la PR précédente est ouverte** (les commits s'ajouteraient à cette PR) : commiter en local et surveiller `git ls-remote origin main`.
- `gh` n'est pas installé. Le navigateur intégré est connecté à GitHub et l'utilisateur a demandé que j'ouvre les PR moi-même : page `compare/main...demo-v1?expand=1`, titre + description, bouton « Create pull request » visible. Terminer la description par la ligne d'attribution Claude Code.
- Commits avec l'identité de `~/.gitconfig` (`user.name` défini dans le dépôt). **Vercel refuse de construire un commit dont l'auteur n'est pas rattaché à un compte GitHub** (c'était la cause des échecs de février).
- Fin de chaque étape : lint, tests, build, et un résumé « fait / reste / simulé ».
- Aucune valeur d'exemple dans les composants : tout vient de `data/seed/` via le `Repository`, avec le commentaire `// EXEMPLE — à remplacer par LOGIMAR`. Le calcul des prix reste dans des fonctions pures testées (`domain/`).
- Fusion : seulement sur demande explicite de l'utilisateur. Nouvelle page de PR de GitHub : encadré « Ready to merge » ; vérifier dans le menu à droite de « Merge pull request » que « Create a merge commit » est coché, puis « Confirm merge ». Ensuite, vérifier le déploiement de production : `curl -s https://api.github.com/repos/ten-mukass/LOGIMAR_DEMO/commits/<sha>/status` (statut « Vercel », dépôt public). Inutile de resynchroniser `demo-v1` : son dernier commit est déjà dans `main`.
- Comptes et services : ne lire, saisir ni committer aucune valeur des variables `POSTGRES_*` / `SUPABASE_*` (les noms seulement) ; le mot de passe de la base est chez l'utilisateur (ne jamais le demander) ; codes de vérification (code par e-mail de Vercel) et fenêtres de connexion ouvertes par les sites : à l'utilisateur. Demander son accord avant de modifier un réglage de compte ou d'intégration, d'appliquer une migration, de charger les données d'exemple ou de supprimer quoi que ce soit. Ne rien publier, ne rien acheter, ne créer aucun compte : services du projet = GitHub, Vercel, Supabase (compte ouvert par l'utilisateur).
- Signaler les incohérences au lieu d'inventer. Répondre en français.

## Architecture

- `domain/` : types et fonctions pures (temps, programme, tarifs par paliers, occupation, passagers, contact, montants, recherche, références, messages) + tests.
- `data/seed/` : toutes les données d'exemple ; ventes générées de façon déterministe (`ventes.ts`).
- `services/` : `index.ts` choisit les implémentations. `Repository` → `DemoRepository` (seed + `localStorage`, clé `logimar-demo:v3:donnees`) ; `PaymentProvider` → `SimulatedProvider` (4 s, refus si le numéro finit par `0000`) ; `NotificationService` → `PreviewNotificationService` ; `AuthService` → `LocalAuthService` ; `AccesGestion` → `CodeDemoAccesGestion` (clé `logimar-demo:v2:gestion-session`) ; `ServiceReservation` ; `ServiceBillets` ; `ServiceGestion` (lecture groupée des ventes, réglage des paliers) ; `ServiceEmbarquement` (contrôle des billets, manifeste de bord, clôture) ; documents (QR signé, PDF).
- `components/` : `ui/`, `site/`, `accueil/`, `horaires/`, `parcours/`, `compte/`, `gestion/` (back-office), `embarquement/` (écran de scan). `app/` : routes, dont `app/admin/` et `app/scan/`. `lib/lecture-qr.ts` : lecture des QR (caméra, photo). `lib/use-etat-ventes.ts` relit les ventes toutes les 30 s, au retour sur l'onglet et quand un autre onglet modifie les données.

## Pièges connus

- Le build télécharge les polices Google (`next/font/google`) : un échec réseau passager fait échouer le build (« module-not-found » sur `montserrat…module.css`), en local comme sur Vercel. Relancer ; si cela se répète, passer aux polices hébergées dans le dépôt.
- Ne pas lancer `next build` pendant que le serveur de développement tourne (dossier `.next` partagé : cache Turbopack corrompu). Arrêter la prévisualisation avant.
- `crypto.subtle` et `crypto.randomUUID` exigent HTTPS ou localhost (pas d'accès en `http` depuis un téléphone sur le réseau local).
- Les ventes d'exemple dépendent de la date réelle : le remplissage progresse avec le temps ; elles cèdent la place aux réservations du visiteur (pas de surréservation).
- `npm audit` : failles connues dans `next` 16.1.6 (antérieures au projet) ; recommander une montée de version 16.x dans une petite PR à part.
- Back-office : une vente d'exemple prévue dans un palier qui était fermé au moment de son achat n'a pas lieu (elle n'est pas reportée sur un autre palier). Les ventes déjà faites avant la fermeture restent.
- Back-office : le titre d'une page placée dans le même segment qu'un `layout` n'hérite pas du modèle de titre de ce layout (d'où `title.absolute` sur `/admin`).
- Le code d'accès est dans le code envoyé au navigateur : il protège l'écran, pas les données (toutes les données de la démo sont dans le navigateur).
- Embarquement : la caméra exige https (ou localhost) ; la démo partage les embarquements entre onglets du même navigateur seulement (deux téléphones ne se voient pas : en production, synchronisation serveur sans doublon).
- Outil de prévisualisation : il lit `.claude/launch.json` dans le dossier de la session ; une copie existe dans le dépôt, ignorée par git (`.git/info/exclude`).
- Base Supabase : Preview et production partagent la même base (offre gratuite). Ne jamais écrire les valeurs des variables `POSTGRES_*` / `SUPABASE_*` ; en local, sans `.env.local`, la page de contrôle affiche « base non configurée ». Le pooler Supabase (mode transaction) refuse les requêtes préparées : garder `prepare: false`. La bibliothèque `postgres` réencode en JSON un paramètre de type jsonb : écrire `$N::text::jsonb` (un test l'impose). Le pooler supporte mal aussi plusieurs requêtes envoyées d'affilée sur une connexion (page bloquée 300 s le 23/11/2026) : `connexion.ts` envoie les requêtes une par une, avec un délai maximum (20 s, 60 s par transaction). L'offre gratuite met le projet en pause après 7 jours sans activité (tâche quotidienne prévue à l'étape E).

## Étapes suivantes

- **7B — Parcours client sur la base** : PR ouverte, à relire sur la Preview puis à fusionner (la production n'en est pas changée). Région des fonctions réglée sur Paris (`vercel.json`).
- Puis **C** (vrais comptes de gestion, création du compte du fondateur ; le plan permet de la faire passer avant B), **D** (back-office et embarquement partagés entre appareils), **E** (tâche quotidienne, qui garde aussi la base active).
- **6 — Recette** : tablette et ordinateur, accessibilité, console, scénario de présentation dans le README.
- Petite PR à part : montée de version de Next.js 16.x (`npm audit`).
- Proposé, pas encore demandé (« pas maintenant ») : un guide pour que le fondateur teste le tableau de bord et le scan.

## Points à confirmer par LOGIMAR

Sens des traversées par jour (hypothèse : deux par jour), capacité du Victoria Jet, grille de prix et quotas, terminaux (« [À CONFIRMER] »), heure de fermeture de l'enregistrement, clôture de la vente en ligne (hypothèse : à l'ouverture de l'enregistrement), conditions et avantages du VIP (modifiable sans frais et remboursable : repris de l'ancien Flex), délai et frais de modification, prix des options, format des numéros gabonais, mentions de la facture (NIF, RCCM, TVA), textes des pages d'aide, bornes d'âge. Back-office : seuil « presque pleine » (exemple 90 %), seuil d'écart à la référence (exemple 20 %), format du manifeste exigé par les autorités, qui valide les changements de prix (revenue manager seul ou direction), possibilité ou non de fermer le VIP. Embarquement : un scan valide fait monter tout le billet d'un coup (ou contrôle passager par passager ?), qui peut rouvrir un embarquement clos, heure de fin de l'embarquement, format du manifeste de bord attendu par les autorités portuaires et la police, téléphones des agents (Android ou iPhone).

## Journal des conversations

### 2026-11-14 → 2026-11-23 - Démo, étapes 0 à 7A
- Fait : étapes 0 à 5 (PR #1 à #8), menu latéral du back-office (PR #9), tarifs Éco et VIP (PR #10), base Supabase créée et reliée à Vercel, plan de branchement validé, étape 7A (PR #11) avec les migrations 0001 et 0002 appliquées et les données d'exemple chargées.
- Décidé : deux tarifs, Éco et VIP (le VIP reprend l'ancien Flex) ; une seule base pour la Preview et la production ; ventes d'exemple gardées dans la base ; migrations appliquées depuis `/preview/base` après relecture ; PGlite pour les tests.
- Reste : étapes 7B à 7E, étape 6 (recette), montée de version de Next.js, points à confirmer par LOGIMAR.

### 2026-11-23 - Étape 7B
- Fait : parcours client sur le serveur et la base (actions serveur, transactions, paiement simulé serveur, Mes billets), tests PGlite, vérification téléphone → ordinateur sur la Preview.
- Décidé : 7B active sur la Preview seulement ; production sur la démo jusqu'à C et D ; pas de migration (identifiant de réservation comme clé d'accès).
- Décidé aussi : fonctions Vercel à Paris (`cdg1`).
- Reste : relecture et fusion de la PR, étapes C, D, E.
