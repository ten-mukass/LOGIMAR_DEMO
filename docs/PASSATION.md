# Passation — démonstration LOGIMAR 241

État au 14 novembre 2026 (fin de l'étape 4).

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
| 3 | Aller-retour, PDF, e-mails, Mes billets, compte, Aide | PR #4 ouverte, Preview verte, en attente de relecture et de fusion |
| 4 | Back-office | Commit `9a225a3` sur `demo-v1`, en local ; à pousser et à ouvrir en PR dès la fusion de la PR #4 |
| 5 | Scan (facultatif) | À faire |
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
- Le back-office a son propre en-tête (l'en-tête et la navigation du site sont masqués sous `/admin`) ; écrans pour ordinateur, utilisables sur tablette (tableaux défilants).
- **Tableau de bord** (`/admin`) : remplissage, recette billets (et options), recette par siège offert, recette par passager, pick-up 7 j, rythme de réservation (places par jour, 30 j), répartition par tarif, par canal et par moyen de paiement, prochaines traversées (palier en vente par famille, écart à la référence, alertes), dernières réservations. Filtres mois et sens.
- **Traversées** (`/admin/traversees`) et **fiche traversée** (`/admin/traversees/[id]`) : paliers (prix, quota, occupées, restantes, état en vente / en attente / épuisé / fermé), bouton Fermer / Ouvrir avec motif obligatoire, historique des changements, courbe J-30 → J0 contre la moyenne des traversées parties du même sens (au moins 3), lien « Voir côté client ». Le dernier palier Flex ne se ferme pas (cahier des charges §3.3).
- Les fermetures de paliers sont stockées dans `logimar-demo:v2:donnees` (`changementsPaliers`) et appliquées par `DemoRepository.listerInventaires` : le prix change aussitôt sur le site (vérifié : 28 000 → 31 000 F en Éco le 20 nov., puis retour).
- **Réservations** (`/admin/reservations`) : recherche (référence, nom sans accent, téléphone, e-mail), filtres traversée, statut, canal, origine (« Ce navigateur »), détail dépliable, 50 par page.
- **Manifeste** (`/admin/traversees/[id]/manifeste`) : passagers payés par ordre alphabétique, pièces, statut d'embarquement ; impression et export CSV (séparateur « ; », pour Excel).
- Calculs en fonctions pures testées : `domain/indicateurs.ts`, `domain/paliers.ts`, `domain/manifeste.ts` ; synthèse par traversée dans `services/gestion/service-gestion.ts`. `Repository.listerReservations` renvoie exactement les réservations qui composent l'occupation (testé sur les 80 traversées).
- Vérifié dans le navigateur (1440 px et tablette 768 px) : connexion, tableau de bord, filtres, fiche, fermeture et réouverture d'un palier, réservation faite sur le site visible au back-office et au manifeste ; console sans erreur. 139 tests, lint et build OK.
- Non fait (hors périmètre de la démo) : calendrier mensuel, modification du prix ou du quota d'un palier, éditeur de grille, règles et simulation, paiements et rapprochement, ventes en agence, export Excel natif.

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
- `services/` : `index.ts` choisit les implémentations. `Repository` → `DemoRepository` (seed + `localStorage`, clé `logimar-demo:v2:donnees`) ; `PaymentProvider` → `SimulatedProvider` (4 s, refus si le numéro finit par `0000`) ; `NotificationService` → `PreviewNotificationService` ; `AuthService` → `LocalAuthService` ; `AccesGestion` → `CodeDemoAccesGestion` (clé `logimar-demo:v2:gestion-session`) ; `ServiceReservation` ; `ServiceBillets` ; `ServiceGestion` (lecture groupée des ventes, réglage des paliers) ; documents (QR signé, PDF).
- `components/` : `ui/`, `site/`, `accueil/`, `horaires/`, `parcours/`, `compte/`, `gestion/` (back-office). `app/` : routes, dont `app/admin/`. `lib/use-etat-ventes.ts` relit les ventes toutes les 30 s, au retour sur l'onglet et quand un autre onglet modifie les données.

## Pièges connus

- Ne pas lancer `next build` pendant que le serveur de développement tourne (dossier `.next` partagé : cache Turbopack corrompu). Arrêter la prévisualisation avant.
- `crypto.subtle` et `crypto.randomUUID` exigent HTTPS ou localhost (pas d'accès en `http` depuis un téléphone sur le réseau local).
- Les ventes d'exemple dépendent de la date réelle : le remplissage progresse avec le temps ; elles cèdent la place aux réservations du visiteur (pas de surréservation).
- `npm audit` : failles connues dans `next` 16.1.6 (antérieures au projet) ; recommander une montée de version 16.x dans une petite PR à part.
- Back-office : une vente d'exemple prévue dans un palier qui était fermé au moment de son achat n'a pas lieu (elle n'est pas reportée sur un autre palier). Les ventes déjà faites avant la fermeture restent.
- Back-office : le titre d'une page placée dans le même segment qu'un `layout` n'hérite pas du modèle de titre de ce layout (d'où `title.absolute` sur `/admin`).
- Le code d'accès est dans le code envoyé au navigateur : il protège l'écran, pas les données (toutes les données de la démo sont dans le navigateur).

## Étapes suivantes (rappel de `docs/PLAN_DEMO.md`)

- **4 — Back-office** : fait (commit local `9a225a3`). Reste à pousser `demo-v1` et à ouvrir la PR une fois la PR #4 fusionnée.
- **5 — Scan** (facultatif) : lecture du QR par la caméra, contrôle de la signature (`verifierQrBillet`), « déjà scanné ».
- **6 — Recette** : tablette et ordinateur, accessibilité, console, scénario de présentation dans le README.

## Points à confirmer par LOGIMAR

Sens des traversées par jour (hypothèse : deux par jour), capacité du Victoria Jet, grille de prix et quotas, terminaux (« [À CONFIRMER] »), heure de fermeture de l'enregistrement, clôture de la vente en ligne (hypothèse : à l'ouverture de l'enregistrement), Standard remboursable ou non, délai et frais de modification, prix des options, format des numéros gabonais, mentions de la facture (NIF, RCCM, TVA), textes des pages d'aide, bornes d'âge. Back-office : seuil « presque pleine » (exemple 90 %), seuil d'écart à la référence (exemple 20 %), format du manifeste exigé par les autorités, qui valide les changements de prix (revenue manager seul ou direction), possibilité ou non de fermer le Flex.
