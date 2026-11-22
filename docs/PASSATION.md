# Passation — démonstration LOGIMAR 241

État au 22 novembre 2026 (étape 5 fusionnée ; menu latéral du back-office en PR).

## Où sont les choses

- Dépôt GitHub : `ten-mukass/LOGIMAR_DEMO`. Copie locale : `~/Developer/LOGIMAR_DEMO`, branche de travail `demo-v1`.
- Vercel : projet `logimar-demo` ; production = `main` (logimar-demo.vercel.app) ; chaque push sur `demo-v1` crée une Preview (protégée par la connexion Vercel).
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
| 5 bis | Back-office : menu latéral réductible (demandé le 22/11/2026) | PR ouverte, à relire sur la Preview |
| 6 | Recette | À faire |

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
- **Traversées** (`/admin/traversees`) et **fiche traversée** (`/admin/traversees/[id]`) : paliers (prix, quota, occupées, restantes, état en vente / en attente / épuisé / fermé), bouton Fermer / Ouvrir avec motif obligatoire, historique des changements, courbe J-30 → J0 contre la moyenne des traversées parties du même sens (au moins 3), lien « Voir côté client ». Le dernier palier Flex ne se ferme pas (cahier des charges §3.3).
- Les fermetures de paliers sont stockées dans `logimar-demo:v2:donnees` (`changementsPaliers`) et appliquées par `DemoRepository.listerInventaires` : le prix change aussitôt sur le site (vérifié : 28 000 → 31 000 F en Éco le 20 nov., puis retour).
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
- **Données** : `Embarquement` (un par passager à bord), `ScanEmbarquement` (journal), `ClotureEmbarquement` ; stockés dans `logimar-demo:v2:donnees` ; `Repository` : `listerEmbarquements`, `enregistrerEmbarquements` (sans doublon), `supprimerEmbarquement`, `listerScans`, `enregistrerScan`, `getClotureEmbarquement`, `definirClotureEmbarquement`. Service : `services/embarquement/service-embarquement.ts`.
- **Back-office** (`/admin/traversees/[id]/manifeste`) : onglet **Manifeste de bord** (passagers scannés, ordre et heure de passage, mode de contrôle) et onglet **Billets vendus** (passagers payés : à embarquer, embarqué, absent après clôture) ; export CSV et impression des deux ; mise à jour automatique quand un scan est fait dans un autre onglet.
- **Billet du client** : tampon « Billet utilisé » et QR grisé une fois tous ses passagers embarqués.
- **Démonstration sur un seul appareil** : panneau « Démonstration : simuler un scan » (billets de l'appareil, billet d'exemple, billet falsifié, billet d'une autre traversée) ; le QR est fabriqué comme sur le billet du client et passe par le même contrôle.
- Vérifié dans le navigateur (téléphone 375 px, tablette, ordinateur) : scan valide, second scan refusé, falsifié refusé, autre traversée, billet de groupe (4 passagers), contrôle manuel, clôture (absents) et réouverture, manifeste de bord et billets vendus, tampon sur le billet du client ; console sans erreur. 158 tests, lint et build OK.
- **Non vérifié** : la caméra elle-même (pas de caméra dans le navigateur intégré) ; à essayer sur un téléphone Android et sur un iPhone, sur la Preview (https).
- **Lecture du QR** (`lib/lecture-qr.ts`) : lecteur intégré au navigateur (`BarcodeDetector`) quand il existe (Chrome et Edge sur Android, Chrome sur ordinateur), sinon décodeur `jsqr` 1.4.0 (Apache-2.0, ajouté le 18/11/2026 avec l'accord de l'utilisateur, chargé à la demande) : Safari sur iPhone, Firefox. Vérifié : tests de décodage d'un QR de billet dessiné comme sur le billet (fond blanc, fond gris décalé, image → passage à bord) et, dans le navigateur avec le lecteur intégré masqué, photo du QR réel d'un billet décodée par jsQR puis contrôlée.

## Méthode de travail (validée)

- Une PR par étape depuis `demo-v1` ; l'utilisateur relit la Preview et fusionne par *merge commit*. **Ne jamais pousser l'étape suivante tant que la PR précédente est ouverte** (les commits s'ajouteraient à cette PR) : commiter en local et surveiller `git ls-remote origin main`.
- `gh` n'est pas installé. Le navigateur intégré est connecté à GitHub et l'utilisateur a demandé que j'ouvre les PR moi-même : page `compare/main...demo-v1?expand=1`, titre + description, bouton « Create pull request » visible. Terminer la description par la ligne d'attribution Claude Code.
- Commits avec l'identité de `~/.gitconfig` (`user.name` défini dans le dépôt). **Vercel refuse de construire un commit dont l'auteur n'est pas rattaché à un compte GitHub** (c'était la cause des échecs de février).
- Fin de chaque étape : lint, tests, build, et un résumé « fait / reste / simulé ».
- Aucune valeur d'exemple dans les composants : tout vient de `data/seed/` via le `Repository`, avec le commentaire `// EXEMPLE — à remplacer par LOGIMAR`. Le calcul des prix reste dans des fonctions pures testées (`domain/`).
- Signaler les incohérences au lieu d'inventer. Répondre en français.

## Architecture

- `domain/` : types et fonctions pures (temps, programme, tarifs par paliers, occupation, passagers, contact, montants, recherche, références, messages) + tests.
- `data/seed/` : toutes les données d'exemple ; ventes générées de façon déterministe (`ventes.ts`).
- `services/` : `index.ts` choisit les implémentations. `Repository` → `DemoRepository` (seed + `localStorage`, clé `logimar-demo:v2:donnees`) ; `PaymentProvider` → `SimulatedProvider` (4 s, refus si le numéro finit par `0000`) ; `NotificationService` → `PreviewNotificationService` ; `AuthService` → `LocalAuthService` ; `AccesGestion` → `CodeDemoAccesGestion` (clé `logimar-demo:v2:gestion-session`) ; `ServiceReservation` ; `ServiceBillets` ; `ServiceGestion` (lecture groupée des ventes, réglage des paliers) ; `ServiceEmbarquement` (contrôle des billets, manifeste de bord, clôture) ; documents (QR signé, PDF).
- `components/` : `ui/`, `site/`, `accueil/`, `horaires/`, `parcours/`, `compte/`, `gestion/` (back-office), `embarquement/` (écran de scan). `app/` : routes, dont `app/admin/` et `app/scan/`. `lib/lecture-qr.ts` : lecture des QR (caméra, photo). `lib/use-etat-ventes.ts` relit les ventes toutes les 30 s, au retour sur l'onglet et quand un autre onglet modifie les données.

## Pièges connus

- Ne pas lancer `next build` pendant que le serveur de développement tourne (dossier `.next` partagé : cache Turbopack corrompu). Arrêter la prévisualisation avant.
- `crypto.subtle` et `crypto.randomUUID` exigent HTTPS ou localhost (pas d'accès en `http` depuis un téléphone sur le réseau local).
- Les ventes d'exemple dépendent de la date réelle : le remplissage progresse avec le temps ; elles cèdent la place aux réservations du visiteur (pas de surréservation).
- `npm audit` : failles connues dans `next` 16.1.6 (antérieures au projet) ; recommander une montée de version 16.x dans une petite PR à part.
- Back-office : une vente d'exemple prévue dans un palier qui était fermé au moment de son achat n'a pas lieu (elle n'est pas reportée sur un autre palier). Les ventes déjà faites avant la fermeture restent.
- Back-office : le titre d'une page placée dans le même segment qu'un `layout` n'hérite pas du modèle de titre de ce layout (d'où `title.absolute` sur `/admin`).
- Le code d'accès est dans le code envoyé au navigateur : il protège l'écran, pas les données (toutes les données de la démo sont dans le navigateur).
- Embarquement : la caméra exige https (ou localhost) ; la démo partage les embarquements entre onglets du même navigateur seulement (deux téléphones ne se voient pas : en production, synchronisation serveur sans doublon).
- Outil de prévisualisation : il lit `.claude/launch.json` dans le dossier de la session ; une copie existe dans le dépôt, ignorée par git (`.git/info/exclude`).

## Étapes suivantes (rappel de `docs/PLAN_DEMO.md`)

- **5 — Embarquement** : fusionnée (PR #7). Le décodeur jsQR est dans une PR à part : ne pas pousser l'étape 6 sur `demo-v1` avant sa fusion.
- **6 — Recette** : tablette et ordinateur, accessibilité, console, scénario de présentation dans le README.

## Points à confirmer par LOGIMAR

Sens des traversées par jour (hypothèse : deux par jour), capacité du Victoria Jet, grille de prix et quotas, terminaux (« [À CONFIRMER] »), heure de fermeture de l'enregistrement, clôture de la vente en ligne (hypothèse : à l'ouverture de l'enregistrement), Standard remboursable ou non, délai et frais de modification, prix des options, format des numéros gabonais, mentions de la facture (NIF, RCCM, TVA), textes des pages d'aide, bornes d'âge. Back-office : seuil « presque pleine » (exemple 90 %), seuil d'écart à la référence (exemple 20 %), format du manifeste exigé par les autorités, qui valide les changements de prix (revenue manager seul ou direction), possibilité ou non de fermer le Flex. Embarquement : un scan valide fait monter tout le billet d'un coup (ou contrôle passager par passager ?), qui peut rouvrir un embarquement clos, heure de fin de l'embarquement, format du manifeste de bord attendu par les autorités portuaires et la police, téléphones des agents (Android ou iPhone).
