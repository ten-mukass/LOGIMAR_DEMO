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
| 5 | Embarquement (demandé le 18/11/2026) : scan du QR, billet utilisable une seule fois, manifeste de bord rempli par les scans. Détail ci-dessous. |
| 6 | Recette : tablette et ordinateur, accessibilité, console, scénario de présentation. |

## Étape 5 — Embarquement (plan détaillé)

Besoin exprimé le 18/11/2026 : le contrôleur scanne le QR du billet ; si le scan est validé, le passager monte ; le billet n'est plus valable ensuite ; le **manifeste de bord** (les personnes réellement à bord) se remplit au fil des scans. La liste des **billets vendus** (passagers payés) reste une liste distincte.

| Élément | Démo | Production |
|---|---|---|
| Écran `/scan` | Mobile d'abord, protégé par le code de démonstration ; choix de la traversée, compteur à bord / attendus | Application installable (PWA), comptes d'agents d'embarquement |
| Lecture du QR | Caméra du téléphone (lecteur intégré BarcodeDetector si disponible, sinon décodeur jsQR : iPhone compris), photo du QR, recherche manuelle par référence ou nom ; bouton démo « simuler le scan » | Idem, hors ligne |
| Contrôle | Signature du QR (`verifierQrBillet`), billet payé, bonne traversée, pas déjà utilisé, embarquement non clos | Idem, avec la liste de la traversée téléchargée avant le départ |
| Résultats | Valide (passagers à contrôler avec leur pièce), déjà scanné (heure du premier scan), autre traversée, non valable (annulé, non payé), invalide (illisible ou falsifié), embarquement clos | Idem |
| Billet utilisé une fois | Un scan valide embarque tous les passagers du billet ; un second scan donne « déjà scanné ». Correction possible passager par passager (« retirer du bord ») | Synchronisation sans doublon entre appareils |
| Manifeste de bord | Rempli par les scans, dans l'ordre d'embarquement, avec l'heure ; export CSV, impression | Envoi aux autorités (format à valider) |
| Billets vendus | Passagers payés avec leur statut : à embarquer, embarqué, absent | Idem |
| Clôture | « Clôturer l'embarquement » : plus de scan, les passagers non embarqués deviennent absents | Idem, avec rapport de traversée |
| Billet du client | Mention « Billet utilisé » une fois embarqué | Idem |

Données ajoutées : `Embarquement` (un par passager embarqué : traversée, réservation, passager, heure, mode scan ou manuel, agent), `ScanEmbarquement` (journal de chaque contrôle et de son résultat), `ClotureEmbarquement`. Logique de contrôle en fonctions pures testées (`domain/embarquement.ts`).

## Décisions par défaut (à confirmer par LOGIMAR)

1. **Sens par jour** : chaque jour de traversée (mardi, vendredi, dimanche) compte deux traversées, Port-Gentil → Libreville le matin (07:25 → 11:00) puis Libreville → Port-Gentil à midi (12:15 → 15:45). Les sources divergent : affiche de mai (mardi départ Libreville, dimanche départ Port-Gentil), affiche d'octobre (« Port-Gentil – Libreville – Port-Gentil »), maquette Résultats (LBV → POG les trois jours).
2. **Aller-retour** : une `Commande` regroupe deux réservations (un paiement, une facture, deux billets). Ajout au modèle de données du cahier des charges.
3. **Groupe et palier** : tous les passagers d'une réservation paient au même palier ; si le palier ouvert n'a plus assez de places pour tout le groupe, on passe au suivant. Alerte « plus que N places à ce prix » sous un seuil réglable.
4. **Bébés** : n'occupent pas de place et ne comptent pas dans les quotas.
5. **Garantie modification** : une par réservation, non proposée avec le VIP (déjà modifiable sans frais).
6. **25 décembre et 1er janvier** (vendredis) : jours de traversée normaux.
7. **Bouton FR · EN** : masqué tant que l'anglais n'est pas fait.
8. **« Le plus choisi »** : calculé à partir des ventes.
9. **Date de référence** : date réelle du jour ; jours passés barrés ; données jusqu'au 31 janvier 2027.
10. **Tarifs** (décision du fondateur, 22/11/2026) : deux familles, Éco et VIP. Le Standard est retiré ; le VIP reprend les conditions de l'ancien Flex (mêmes sièges que l'Éco, modifiable sans frais, remboursable, embarquement prioritaire, toujours vendable) ; l'Éco est inchangé (ni modifiable ni remboursable, garantie modification en option). Grille d'exemple : Éco en 5 paliers de 30 places (25 000 → 39 000 F l'adulte), VIP à 55 000 F sans quota propre. Les données enregistrées dans les navigateurs avant ce changement sont abandonnées (clé `logimar-demo:v3:donnees`).
