# LOGIMAR 241 — démonstration de réservation en ligne

Application de réservation du catamaran **Victoria Jet** entre Libreville et Port-Gentil.
Version de **démonstration** : données d'exemple, paiement et envois simulés, aucune base de données.

- Spécifications : [`docs/`](docs/README.md) — le périmètre de la démo est dans [`docs/PERIMETRE_DEMO.md`](docs/PERIMETRE_DEMO.md).
- Plan de réalisation et décisions : [`docs/PLAN_DEMO.md`](docs/PLAN_DEMO.md).
- Déploiement : projet Vercel `logimar-demo`, à chaque push sur `main` (Preview pour les autres branches).

## Commandes

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test         # tests unitaires (Vitest)
npm run build
```

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Vitest.
