# Prompt à copier-coller dans Claude Code

À lancer depuis le dossier du dépôt cloné `LOGIMAR_DEMO` sur ton Mac (ou en demandant à Claude Code de le cloner).

---

Tu reprends le projet LOGIMAR 241 : l'application de réservation en ligne d'une compagnie maritime gabonaise qui exploite le catamaran Victoria Jet entre Libreville et Port-Gentil. L'objectif immédiat est une **démonstration** à présenter au fondateur de LOGIMAR. Si elle est validée, on passera à la production.

## Ce qui existe déjà

- Dépôt GitHub : `ten-mukass/LOGIMAR_DEMO` (branche `main`), Next.js 16, React 19, TypeScript, Tailwind 4. Toutes les données y sont fictives et il n'y a ni base, ni paiement, ni authentification.
- Projet Vercel `logimar-demo` déjà relié au dépôt GitHub : chaque push sur `main` déclenche un déploiement (adresse actuelle `logimar-demo.vercel.app`). Ne crée pas de nouveau projet ni de nouveau compte.
- Attention : sur GitHub, le dernier commit (`d73f373`, « Trigger Redeploy ») a des déploiements Preview et Production en échec, alors que Vercel affiche un ancien déploiement « Ready ». Commence par comprendre pourquoi (`npm run build` en local, et logs Vercel si tu y as accès).

## Le dossier de spécifications

Il est dans `/Users/therneeskensmbinambina/Documents/LOGIMAR`. Copie-le dans le dépôt sous `docs/` (sauf s'il y est déjà) et lis-le en entier, dans cet ordre :

1. `README.md` : contenu du dossier.
2. `PERIMETRE_DEMO.md` : **ce que tu dois livrer maintenant**. C'est lui qui fait foi en cas de doute.
3. `ETAT_DU_DEPOT.md` : analyse du code actuel et défauts à corriger.
4. `CAHIER_DES_CHARGES_RESERVATION.md` : règles de gestion complètes et modèle de données (production).
5. `DESIGN_TOKENS.md` : charte graphique (couleurs, polices, tokens CSS).
6. `maquettes/` : les écrans à reproduire. Ouvre les fichiers `.html` dans un navigateur ou regarde les `png/`. Le HTML des maquettes peut servir de base, mais refais-le proprement en composants React + Tailwind.
7. `assets/` : logo, photo du Victoria Jet, logos Airtel Money et Moov Money, affiches de programme.
8. `CAHIER_DES_CHARGES_GESTION.md` : back-office (production). Pour la démo, n'en prends que ce que `PERIMETRE_DEMO.md` demande.
9. `ANALYSE_CONCURRENCE.md` : contexte (concurrent NGV Lines).

## Comment travailler

1. **Avant d'écrire du code**, propose-moi un plan court :
   - la cause de l'échec du déploiement ;
   - ce que tu gardes, refais ou supprimes dans le code actuel ;
   - l'architecture (interfaces `Repository`, `PaymentProvider`, `NotificationService`, `AuthService` avec leurs implémentations simulées) ;
   - le découpage en étapes, chacune livrable et déployable.
   Attends ma validation.
2. Travaille sur une branche (`demo-v1`) et ouvre une pull request par étape ; je fusionne dans `main` après relecture sur le déploiement Preview de Vercel.
3. Mobile d'abord (390 px), puis vérifie tablette et ordinateur.
4. Aucune valeur d'exemple codée en dur dans les composants : tout vient de `data/seed/` à travers le `Repository`, et chaque valeur inventée porte le commentaire `// EXEMPLE — à remplacer par LOGIMAR`.
5. Le calcul des prix (paliers, quotas, blocage) est une fonction pure testée par des tests unitaires.
6. À la fin de chaque étape : `npm run lint` et `npm run build` sans erreur, et un résumé de ce qui est fait, de ce qui reste et de ce qui est simulé.
7. Si une règle te paraît incohérente ou manque d'information, signale-le au lieu d'inventer.
8. Ne publie rien, n'achète rien et ne crée aucun compte de service externe : la démo n'utilise que GitHub et Vercel.
