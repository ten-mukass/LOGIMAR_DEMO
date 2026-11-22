# LOGIMAR 241 — Périmètre de la démonstration

Version 1.0 — 14 novembre 2026

## Objectif

Présenter au fondateur de LOGIMAR une application **crédible et cliquable de bout en bout** : réservation sur mobile, yield management visible, billet avec QR code, et un aperçu du back-office. Si LOGIMAR valide, la version de production suivra (nom de domaine, hébergement, base de données, comptes marchands Airtel et Moov, prestataire d'e-mails).

Pour la démo : **aucun compte ni service payant nouveau**. On utilise le dépôt GitHub `ten-mukass/LOGIMAR_DEMO` et le projet Vercel `logimar-demo` existants (offre Hobby, adresse `logimar-demo.vercel.app`).

## Règle d'or

Le code de la démo est le **début du code de production**, pas une maquette jetable. Tout ce qui sera réel plus tard passe déjà par une interface, avec une implémentation simulée pour la démo :

| Interface | Démo | Production (après validation) |
|---|---|---|
| `Repository` (accès aux données) | Données d'exemple en TypeScript + réservations du visiteur en `localStorage` | PostgreSQL |
| `PaymentProvider` | `SimulatedProvider` : écran « Validez le paiement sur votre téléphone », succès après 4 s ; un numéro se terminant par `0000` simule un refus | `AirtelMoneyProvider`, `MoovMoneyProvider` |
| `NotificationService` | Aucun envoi : page « Aperçu de l'e-mail » avec le contenu qui serait envoyé | Prestataire d'e-mails (V1), SMS et WhatsApp (V2) |
| `AuthService` (compte client) | Compte stocké sur l'appareil | Base + vérification par e-mail |

## Ce qui est réel dans la démo

- Tout le parcours client des maquettes (`maquettes/`) : accueil, résultats, passagers, paiement, billet, horaires, mes billets.
- **Calcul des prix par paliers** (yield) dans le code, sur les données d'exemple : la bande de dates, les tarifs Éco / VIP (deux tarifs depuis le 22/11/2026, décision du fondateur) et l'alerte « plus que N places à ce prix » sont calculés, pas écrits en dur.
- Blocage des places et du tarif pendant 15 min avec compte à rebours.
- Durées calculées, calendrier limité aux jours de traversée.
- Référence de billet, **QR code généré** et billet PDF + facture PDF téléchargeables.
- Retrouver un billet par référence + téléphone ou e-mail.
- Français ; l'anglais peut attendre.

## Back-office dans la démo (après le parcours client)

Pages `/admin` existantes, refaites à la charte et branchées sur les **mêmes données d'exemple** (les chiffres doivent être cohérents entre eux) :
- Tableau de bord : remplissage, recette, recette par siège offert, rythme de réservation, répartition par tarif.
- Fiche traversée : paliers de prix, quotas, vendus ; ouvrir ou fermer un palier et voir le prix changer côté client.
- Réservations et manifeste d'une traversée.
- Accès protégé par un simple code de démonstration (pas de vrai système de rôles).
- Retirer le simulateur actuel (`yield-simulator.tsx`) et le badge « IA ACTIVE ».

## Données d'exemple

- Navire : **Victoria Jet** uniquement. Capacité : valeur d'exemple, à marquer comme telle (`// EXEMPLE — à remplacer par LOGIMAR`).
- Traversées : mardi, vendredi et dimanche, de novembre 2026 à janvier 2027.
  - Départ Libreville : enregistrement 09:30, départ 12:15, arrivée 15:45.
  - Départ Port-Gentil : enregistrement 05:25, départ 07:25, arrivée 11:00.
- Prix : grille d'exemple cohérente (paliers croissants), marquée comme exemple. Ne pas reprendre les prix de NGV Lines.
- Réservations déjà « vendues » générées pour que les remplissages varient (certaines traversées presque pleines, une complète).
- Terminal de Libreville : libellé `[À CONFIRMER]` tant que LOGIMAR ne l'a pas donné.
- Noms de passagers d'exemple neutres.

Toutes les valeurs d'exemple sont regroupées dans un seul dossier (ex. `data/seed/`) pour être remplacées facilement.

## Ce qui n'est pas dans la démo

- Vrais paiements, vrais e-mails, SMS, WhatsApp.
- Base de données, nom de domaine, comptes marchands.
- Ventes en agence, caisse, rapprochement, règles automatiques de yield, prévision.
- Application de scan : facultative ; si le temps le permet, lecture du QR par la caméra et contrôle de la signature.

## Bandeau

Garder un bandeau discret « Version de démonstration — données d'exemple ». Retirer les faux partenaires, l'offre « -50 % Airtel Money », « Meilleur prix garanti » et « Simulateur Yield Actif ».

## Critères de fin de démo

- Le parcours complet fonctionne sur un téléphone, sans erreur dans la console.
- Une réservation faite sur le site apparaît dans « Mes billets » et dans le back-office du même navigateur.
- Fermer un palier dans le back-office change le prix affiché côté client.
- `npm run build` et `npm run lint` passent ; le déploiement Vercel de `main` est au vert.
