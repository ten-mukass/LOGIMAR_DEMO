# LOGIMAR 241 — Plan de réalisation de la démonstration

Validé le 14 novembre 2026. Complète `PERIMETRE_DEMO.md`, qui fait foi en cas de doute.

## Échec du déploiement Vercel (diagnostic du 14/11/2026)

| Commit | Statut Vercel | Cause |
|---|---|---|
| `86a8294` « Démo Initiale » | Deployment has failed | `useSearchParams()` sans `<Suspense>` sur `/book/checkout` : échec du pré-rendu (reproduit en local). |
| `35a96af`, `214ef61`, `d73f373` | No GitHub account was found matching the commit author email address | Build jamais lancé : l'auteur des commits était l'adresse locale du Mac (`…@….local`), sans compte GitHub associé. |

Le code de `d73f373` compile. Correctif : commits signés avec une adresse e-mail rattachée au compte GitHub. Le site en ligne restait donc sur un ancien déploiement.

## Architecture

```
domain/        fonctions pures (tarifs, paliers, quotas, blocage, horaires, références, validation) + tests Vitest
data/seed/     toutes les valeurs d'exemple (« // EXEMPLE — à remplacer par LOGIMAR »)
services/
  repository/    Repository           → DemoRepository (seed + localStorage)          → production : PostgreSQL
  payment/       PaymentProvider      → SimulatedProvider                             → AirtelMoneyProvider, MoovMoneyProvider
  notification/  NotificationService  → PreviewNotificationService (aperçu, aucun envoi) → prestataire d'e-mails
  auth/          AuthService          → LocalAuthService (compte sur l'appareil)       → base + vérification e-mail
  documents/     billet PDF, facture PDF, QR signé
  index.ts       seul point de choix des implémentations
```

- Interfaces asynchrones : le passage au serveur ne touche pas les écrans.
- Le prix est toujours calculé par une fonction pure à partir de la traversée, de la famille, des passagers, des ventes, des blocages et des paliers fermés par l'admin.
- Programme généré par règle (jours × période × horaires) ; ventes d'exemple générées de façon déterministe : mêmes chiffres côté client et back-office.
- Simulé dans la démo : signature du QR (clé de démo dans le code), code d'accès admin, numérotation des factures par navigateur, paiement, envoi d'e-mails, compte client.

## Étapes (une pull request chacune, depuis `demo-v1`)

| # | Contenu |
|---|---|
| 0 | Remise au vert : `docs/`, erreurs de lint, Vitest, identité git. |
| 1 | Fondations : charte (tokens, polices), composants de base, `domain/` + tests, `data/seed/`, Repository, layout ; suppression de l'ancien parcours. Accueil et Horaires. |
| 2 | Réservation aller simple : Résultats, Passagers, Options et paiement (blocage 15 min), Billet (référence, QR). |
| 3 | Billet et facture PDF, aperçu de l'e-mail, Mes billets, compte client, Aide, aller-retour. |
| 4 | Back-office : accès par code, tableau de bord, fiche traversée (paliers), réservations, manifeste. |
| 5 | Facultatif : scan par la caméra et contrôle de la signature. |
| 6 | Recette : tablette et ordinateur, accessibilité, console, scénario de présentation. |

## Décisions par défaut (à confirmer par LOGIMAR)

1. **Sens par jour** : chaque jour de traversée (mardi, vendredi, dimanche) compte deux traversées, Port-Gentil → Libreville le matin (07:25 → 11:00) puis Libreville → Port-Gentil à midi (12:15 → 15:45). Les sources divergent : affiche de mai (mardi départ Libreville, dimanche départ Port-Gentil), affiche d'octobre (« Port-Gentil – Libreville – Port-Gentil »), maquette Résultats (LBV → POG les trois jours).
2. **Aller-retour** : une `Commande` regroupe deux réservations (un paiement, une facture, deux billets). Ajout au modèle de données du cahier des charges.
3. **Groupe et palier** : tous les passagers d'une réservation paient au même palier ; si le palier ouvert n'a plus assez de places pour tout le groupe, on passe au suivant. Alerte « plus que N places à ce prix » sous un seuil réglable.
4. **Bébés** : n'occupent pas de place et ne comptent pas dans les quotas.
5. **Garantie modification** : une par réservation, non proposée avec Flex.
6. **25 décembre et 1er janvier** (vendredis) : jours de traversée normaux.
7. **Bouton FR · EN** : masqué tant que l'anglais n'est pas fait.
8. **« Le plus choisi »** : calculé à partir des ventes.
9. **Date de référence** : date réelle du jour ; jours passés barrés ; données jusqu'au 31 janvier 2027.
