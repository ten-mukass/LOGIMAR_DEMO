# Prompt de reprise - nouvelle conversation Claude Code

Mis à jour le 23 novembre 2026, étape 7B en PR (active sur la Preview seulement). À coller dans une nouvelle conversation Claude Code ouverte dans `~/Developer/LOGIMAR_DEMO`. À mettre à jour à chaque passation, avec `PASSATION.md`.

```text
Tu reprends le projet LOGIMAR 241, dans ~/Developer/LOGIMAR_DEMO, branche demo-v1. C'est la démonstration de l'application de réservation en ligne de LOGIMAR 241 (catamaran Victoria Jet, Libreville - Port-Gentil), à présenter au fondateur de LOGIMAR. Réponds en français.

1. Avant toute chose
- Lis en entier, dans cet ordre : docs/PASSATION.md (état, méthode de travail, pièges connus ; il fait foi pour la suite), docs/PLAN_BASE_DE_DONNEES.md (plan validé, étapes A à E), docs/PERIMETRE_DEMO.md (périmètre de la démo). Ne lis les cahiers des charges (docs/CAHIER_DES_CHARGES_*.md) que pour la partie que tu touches.
- Vérifie l'état : git status, git log --oneline -5 origin/main, npm test (189 tests verts le 23/11/2026).
- Fais-moi un point en cinq lignes, puis attends ma consigne avant d'écrire du code.

2. Où on en est (23/11/2026)
- Étapes 0 à 5 de la démo fusionnées et en production (logimar-demo.vercel.app), plus le menu latéral du back-office (PR #9) et les deux tarifs Éco et VIP (PR #10 : le Standard est supprimé, le VIP reprend l'ancien Flex).
- Étape 7A fusionnée (PR #11, commit 499b377) : schéma PostgreSQL, PostgresRepository testé sur PGlite, page de contrôle /preview/base (Preview seulement, 404 en production). Base Supabase logimar-241 : migrations 0001 et 0002 appliquées, données d'exemple chargées et identiques à la démo, RLS sur toutes les tables, aucune règle d'accès, aucun droit pour anon et authenticated.
- Étape 7B (parcours client sur la base) : PR ouverte depuis demo-v1, active sur la Preview seulement (aiguillage services/mode-donnees.ts). La production garde la démo du navigateur jusqu'aux étapes C et D. Vérifié sur la Preview : réservation au téléphone retrouvée sur l'ordinateur. Lent (fonctions Vercel loin de la base) : décision attendue sur la région Paris (cdg1).
- Le compte du fondateur est prévu à l'étape C.
- Reste aussi : étape 6 (recette), une petite PR de montée de version de Next.js 16.x (failles signalées par npm audit), et les points à confirmer par LOGIMAR (fin de la passation).

3. Objectif de cette conversation
- Si la PR de 7B est encore ouverte : attendre ma relecture et ma demande de fusion (ne rien pousser d'autre sur demo-v1).
- Sinon, étape C du plan (comptes de gestion, compte du fondateur) : commence par me proposer son découpage et attends ma validation.

4. Méthode (toujours en vigueur)
- Une PR par étape depuis demo-v1. Tu ouvres la PR toi-même dans le navigateur intégré (gh n'est pas installé), description terminée par la ligne d'attribution Claude Code. Je relis la Preview ; la fusion se fait par merge commit, et seulement quand je te le demande.
- Ne pousse jamais l'étape suivante sur demo-v1 tant qu'une PR est ouverte : commite en local et attends la fusion.
- Aucune valeur d'exemple codée en dur dans les composants : tout vient de data/seed/ à travers le Repository, et chaque valeur inventée porte le commentaire « // EXEMPLE — à remplacer par LOGIMAR ». Le calcul des prix, paliers et quotas reste dans des fonctions pures testées (domain/).
- Mobile d'abord (390 px) pour le site client ; le back-office est d'abord pour ordinateur.
- Commits avec l'identité de ~/.gitconfig : Vercel refuse de construire un commit dont l'auteur n'est pas rattaché à un compte GitHub.
- Ne lance jamais npm run build pendant que le serveur de développement tourne (cache .next corrompu) : arrête la prévisualisation avant. Serveur de développement : configuration logimar-dev, port 3241 (voir la passation).
- Fin de chaque étape : lint, tests, build, vérification dans le navigateur intégré (téléphone et ordinateur), passation à jour (docs/PASSATION.md et docs/PROMPT_REPRISE.md), résumé « fait / reste / simulé ».
- Si une règle te paraît incohérente ou s'il manque une information, signale-le au lieu d'inventer.
- Ne publie rien, n'achète rien et ne crée aucun compte de service externe. Services du projet : GitHub, Vercel et Supabase (compte ouvert par moi).

5. Base de données et comptes : précautions
- Ne lis, ne saisis et ne committe jamais les valeurs des variables POSTGRES_* et SUPABASE_* : vérifie seulement leurs noms. Le mot de passe de la base est chez moi : ne me le demande pas.
- Les codes de vérification (par exemple le code envoyé par e-mail par Vercel) et les fenêtres de connexion ouvertes par les sites, c'est moi qui m'en occupe.
- Demande mon accord avant d'appliquer une migration ou de recharger les données d'exemple (bouton de /preview/base sur la Preview, après ma relecture de la PR), avant de modifier un réglage de compte ou d'intégration, et avant toute suppression.
- Preview et production partagent la même base (offre gratuite) : une réservation de test faite sur la Preview est dans la base de production (la production ne la lit pas tant qu'elle reste en mode démo).
- Pièges déjà rencontrés (détail dans la passation) : pooler Supabase en mode transaction, donc prepare: false et requêtes envoyées une par une ; paramètres jsonb à écrire $N::text::jsonb ; échecs passagers du téléchargement des polices Google au build (relancer).

6. Liens
- Preview de demo-v1 : https://logimar-demo-git-demo-v1-mukass-projects.vercel.app (connexion Vercel demandée)
- Production : https://logimar-demo.vercel.app
- Supabase : https://supabase.com/dashboard/project/ogrhxwlvwkrahtsbpbuo (organisation LOGIMAR 241, projet logimar-241)
- Dépôt : https://github.com/ten-mukass/LOGIMAR_DEMO
```

Titre suggéré pour la conversation : « LOGIMAR 241 - étape 7C, comptes de gestion ». Modèle recommandé : Opus (code, base de données, vérifications).
