# Passation — démonstration LOGIMAR 241

État au 14 novembre 2026, à reprendre dans une nouvelle conversation.

## Où sont les choses

- Dépôt GitHub : `ten-mukass/LOGIMAR_DEMO`. Copie locale : `~/Developer/LOGIMAR_DEMO`, branche de travail `demo-v1`.
- Vercel : projet `logimar-demo` ; production = `main` (logimar-demo.vercel.app) ; chaque push sur `demo-v1` crée une Preview (protégée par la connexion Vercel).
- Spécifications : `docs/` (`PERIMETRE_DEMO.md` fait foi). Plan validé et décisions par défaut : `docs/PLAN_DEMO.md`.
- Serveur de développement : configuration `~/Developer/.claude/launch.json`, nom `logimar-dev`, port 3241 (à lancer avec l'outil de prévisualisation du navigateur intégré).

## Avancement

| Étape | Contenu | État |
|---|---|---|
| 0 | Remise au vert du déploiement | Fusionnée (PR #1) |
| 1 | Fondations, Accueil, Horaires | Fusionnée (PR #2), en production |
| 2 | Parcours aller simple jusqu'au billet | PR #3 ouverte, Preview verte, en attente de relecture |
| 3 | Aller-retour, PDF, e-mails, Mes billets, compte, Aide | **En cours** : commit local `4987b93`, non poussé |
| 4 | Back-office | À faire |
| 5 | Scan (facultatif) | À faire |
| 6 | Recette | À faire |

### Étape 3 : déjà fait (commit local `4987b93`)

- Modèle `Commande` (aller simple ou aller-retour, un paiement, une facture numérotée sans trou `F-2026-000001`), `Envoi`, `Client`, `CodeVerification` dans `domain/types.ts`.
- `ServiceReservation` réécrit autour de la commande (`bloquer` avec `segments`, `lireCommande`, `liberer`, `payer`, émission + e-mail de confirmation).
- Résultats en deux temps pour l'aller-retour (paramètres d'URL `t`/`f` = aller, `tr`/`fr` = retour) ; Passagers et Paiement adaptés.
- PDF billet et facture (`services/documents/pdf.ts`, pdf-lib, chargé à la demande) ; assemblage des données dans `services/documents/documents.ts`.
- `NotificationService` + `PreviewNotificationService` (rien n'est envoyé) + page `/apercu-email/[id]`.
- `AuthService` + `LocalAuthService` (compte après paiement, code e-mail, connexion, mot de passe oublié, passagers enregistrés, suppression).
- `ServiceBillets` (recherche par référence + contact, billets consultables sur l'appareil) ; l'écran Billet vérifie l'accès.
- Écran Billet refait : aller/retour, Billet PDF, Facture PDF, aperçu de l'e-mail, création du compte (`components/parcours/carte-compte.tsx`), partage WhatsApp.
- 104 tests ; lint et build OK. **Pas encore vérifié dans le navigateur.**

### Étape 3 : reste à faire

1. Écran **Mes billets** (`app/mes-billets/page.tsx`, aujourd'hui page d'attente) d'après `docs/maquettes/png/07-mes-billets.png` : formulaire référence + téléphone ou e-mail (`billets.rechercher`, accepte `?ref=` en préremplissage), liste « Sur ce téléphone » (`billets.consultables()`), billet d'exemple pour la démo (`repository.exempleBillet`), lien vers le compte. Ne pas promettre la consultation hors ligne (PWA non faite).
2. Écran **Mon compte** (`/compte`) : connexion, mot de passe oublié, vérification du code si en attente ; une fois connecté : billets à venir et passés, factures PDF, passagers enregistrés (suppression), déconnexion, suppression du compte. Lien depuis Mes billets et l'en-tête ordinateur.
3. **Passagers** : remplacer la valeur provisoire `clientId` dans `components/parcours/ecran-passagers.tsx` par le client connecté (`auth.session()`), pré-remplir le contact et proposer « Passager enregistré » sur chaque fiche (c'est aussi la case « Je suis ce passager » de la maquette).
4. Page **Aide** (`/aide`) construite à partir de `data/seed/aide.ts` (ancres `pieces`, `bagages`, `enfants`, `accessibilite`, `cgt`, `confidentialite`…), avec les numéros des agences.
5. Vérifier tout le parcours dans le navigateur à 390 px, en tablette et sur ordinateur (aller-retour, refus `0000`, PDF, aperçu e-mail, création de compte, Mes billets), console sans erreur.
6. `npm run lint`, `npm test`, `npm run build`, puis commit. Pousser seulement quand la PR #3 est fusionnée ; ouvrir la PR de l'étape 3.

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
- `services/` : `index.ts` choisit les implémentations. `Repository` → `DemoRepository` (seed + `localStorage`, clé `logimar-demo:v2:donnees`) ; `PaymentProvider` → `SimulatedProvider` (4 s, refus si le numéro finit par `0000`) ; `NotificationService` → `PreviewNotificationService` ; `AuthService` → `LocalAuthService` ; `ServiceReservation` ; `ServiceBillets` ; documents (QR signé, PDF).
- `components/` : `ui/`, `site/`, `accueil/`, `horaires/`, `parcours/`, `compte/`. `app/` : routes.

## Pièges connus

- Ne pas lancer `next build` pendant que le serveur de développement tourne (dossier `.next` partagé : cache Turbopack corrompu). Arrêter la prévisualisation avant.
- `crypto.subtle` et `crypto.randomUUID` exigent HTTPS ou localhost (pas d'accès en `http` depuis un téléphone sur le réseau local).
- Les ventes d'exemple dépendent de la date réelle : le remplissage progresse avec le temps ; elles cèdent la place aux réservations du visiteur (pas de surréservation).
- `npm audit` : failles connues dans `next` 16.1.6 (antérieures au projet) ; recommander une montée de version 16.x dans une petite PR à part.

## Étapes suivantes (rappel de `docs/PLAN_DEMO.md`)

- **4 — Back-office** (`/admin`) : accès par code de démo (dans le seed), tableau de bord (remplissage, recette, recette par siège offert, rythme de réservation, répartition par tarif), fiche traversée (paliers, quotas, vendus ; ouvrir ou fermer un palier, à stocker dans le navigateur et à prendre en compte par `DemoRepository.listerInventaires`, pour que le prix change côté client), réservations et manifeste. Chiffres cohérents avec le client.
- **5 — Scan** (facultatif) : lecture du QR par la caméra, contrôle de la signature (`verifierQrBillet`), « déjà scanné ».
- **6 — Recette** : tablette et ordinateur, accessibilité, console, scénario de présentation dans le README.

## Points à confirmer par LOGIMAR

Sens des traversées par jour (hypothèse : deux par jour), capacité du Victoria Jet, grille de prix et quotas, terminaux (« [À CONFIRMER] »), heure de fermeture de l'enregistrement, clôture de la vente en ligne (hypothèse : à l'ouverture de l'enregistrement), Standard remboursable ou non, délai et frais de modification, prix des options, format des numéros gabonais, mentions de la facture (NIF, RCCM, TVA), textes des pages d'aide, bornes d'âge.
