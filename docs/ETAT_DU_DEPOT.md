# État du dépôt LOGIMAR_DEMO

Relevé du 14 novembre 2026 sur `github.com/ten-mukass/LOGIMAR_DEMO`, branche `main`, commit `d73f373` (« Trigger Redeploy »).

## Stack

- Next.js 16.1.6 (App Router), React 19.2, TypeScript 5.
- Tailwind CSS 4, lucide-react, framer-motion, class-variance-authority, clsx, tailwind-merge.
- Déploiement Vercel, projet `logimar-demo`.

## Ce qui existe

| Zone | Fichiers | État |
|---|---|---|
| Client | `app/page.tsx`, `search`, `book`, `book/seats`, `book/checkout`, `book/success`, `trips`, `profile` | Parcours de démonstration, données fictives. |
| Admin | `app/admin` (tableau de bord, `reservations`, `bookings`, `passengers`, `yield`, `settings`) | Écrans statiques ; `bookings` et `settings` sont quasi vides (10 lignes). |
| Scan | `app/scan/page.tsx` | Scan simulé (délai et résultat aléatoires), pas de lecture réelle de QR. |
| Composants | `booking-search`, `trip-card`, `seat-map`, `price-calendar`, `yield-simulator`, `site-header`, `bottom-nav`, `demo-banner`, `ui/button` | Réutilisables après adaptation à la charte. |
| Données | `data/mocks.ts` | 2 navires et 2 traversées inventés (« Logimar Express I », « Logimar Queen »). |

## Ce qui manque

- Base de données, API serveur, authentification, rôles.
- Paiement réel et webhooks.
- Envoi de SMS et d'e-mails, génération de PDF et de QR code signé.
- Toute persistance : les réservations ne sont enregistrées nulle part.

## Points à corriger

- Données inventées à remplacer : navires (le seul navire réel connu est le Victoria Jet), horaires, prix, transactions et noms de passagers de l'admin.
- `yield-simulator.tsx` : le « gain » augmente quelle que soit la règle, baisse de prix comprise (valeur absolue de l'ajustement) ; badge « IA ACTIVE » trompeur.
- `admin/yield` : calendrier des prix généré par un modulo sur le numéro du jour (simulé).
- Libellés de règles en anglais (« Early Bird », « Last Minute ») : à franciser.
- Statut de déploiement : sur GitHub, Preview et Production apparaissent en échec pour le dernier commit, alors que Vercel affiche un déploiement de production « Ready » vieux de 270 jours. À vérifier dans les logs Vercel avant de reprendre.
- `move_project.sh` à la racine : script de déplacement local, à retirer du dépôt s'il n'a plus d'usage.

## Recommandations techniques (à valider)

- Base PostgreSQL hébergée, avec un ORM typé (Prisma ou Drizzle) et des migrations versionnées.
- Server Actions ou routes API Next.js pour la recherche, le blocage et la réservation, avec transactions.
- Authentification du back-office avec rôles et double facteur.
- Tâches planifiées via les crons Vercel ou un service de file d'attente.
- Tests : unitaires sur le calcul des prix et des paliers, de bout en bout (Playwright) sur le parcours de réservation.
