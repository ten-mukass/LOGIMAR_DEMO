# LOGIMAR 241 — Cahier des charges de l'application de gestion

Version 1.0 — 14 novembre 2026
Périmètre : back-office de LOGIMAR (phase 2) — programme, inventaire, **yield management**, réservations, embarquement, ventes en agence, paiements, tableaux de bord.
À lire avec : `CAHIER_DES_CHARGES_RESERVATION.md` (modèle de données, section 7), `ETAT_DU_DEPOT.md`, `DESIGN_TOKENS.md`.

Ordre de réalisation : la phase 1 (réservation client) passe d'abord. Le back-office partage la même base et le même dépôt (`/admin`, `/scan`).

---

## 1. Objectifs

1. Piloter le programme des traversées sans développeur (horaires, terminaux, info trafic).
2. Maximiser la recette par traversée grâce au yield management : vendre tôt à prix bas pour remplir, vendre tard à prix plus haut quand la demande est forte.
3. Sécuriser l'embarquement : manifeste passagers fiable, scan des billets, contrôle d'identité.
4. Donner à la direction une vision chiffrée et à jour : remplissage, recette, rythme de vente, paiements.

## 2. Utilisateurs et rôles

| Rôle | Droits principaux |
|---|---|
| Administrateur | Tout, dont utilisateurs, paramètres, journal d'audit. |
| Direction | Lecture de tous les tableaux de bord et rapports, export. Aucune modification. |
| Revenue manager | Tarifs, paliers, quotas, règles de yield, simulations, ouverture et fermeture des ventes. |
| Exploitation | Programme, navires, terminaux, info trafic, annulation ou retard d'une traversée. |
| Agent de vente (agence) | Vente au comptoir, encaissement espèces et Mobile Money, modification et annulation selon CGT, réimpression de billet. |
| Agent d'embarquement | Application de scan, manifeste de la traversée du jour, marquage des absents. |
| Comptabilité | Paiements, rapprochement, remboursements, exports comptables. |

- Authentification obligatoire avec double facteur pour Administrateur, Revenue manager et Comptabilité.
- Chaque modification de prix, de quota, de programme ou de réservation est inscrite au **journal d'audit** (qui, quand, avant, après, motif).

## 3. Modules

### 3.1 Tableau de bord (accueil du back-office)

Filtres communs : période, sens (LBV → POG, POG → LBV), navire, canal (web, agence, téléphone).

| Indicateur | Définition |
|---|---|
| Taux de remplissage | Passagers payés ÷ capacité vendable, par traversée et en moyenne. |
| Recette | Somme des billets payés (hors remboursements), avec et sans options. |
| Recette moyenne par passager | Recette billets ÷ passagers payés. |
| Recette par siège offert | Recette billets ÷ capacité vendable. C'est l'indicateur principal du yield. |
| Rythme de réservation | Courbe des passagers cumulés de J-30 à J0, comparée à la courbe de référence des traversées similaires. |
| Pick-up | Réservations des 1, 7 et 14 derniers jours pour chaque traversée à venir. |
| Répartition | Par famille tarifaire (Éco, Standard, Flex), par catégorie de passager, par canal, par moyen de paiement. |
| Paiements | Taux d'échec, montants en attente, montants à rembourser. |
| Absences | Taux de passagers payés non embarqués. |
| Annulations et modifications | Nombre, recette des frais de modification. |

Vues :
- **Prochaines traversées** : une ligne par traversée avec remplissage, recette, palier ouvert par famille, écart à la courbe de référence et alerte (en avance / en retard).
- **Graphiques** : recette par semaine, remplissage par traversée, rythme de réservation.
- **Transactions récentes** et **alertes** (paiement bloqué, traversée presque pleine, traversée en retard sur la courbe).

Chaque chiffre est cliquable vers la liste détaillée qui le compose.

### 3.2 Programme et exploitation

- Création des traversées en série : sens, jours de la semaine, période, heures (enregistrement, départ, arrivée), navire, terminaux.
- Modification ponctuelle d'une traversée ; retard ; annulation avec notification de tous les passagers (e-mail en V1, SMS et WhatsApp en V2) et choix proposé (report ou remboursement).
- Navires : capacité totale, capacité vendable par traversée (blocages : équipage, réserve, places réservées à l'État ou aux autorités si besoin).
- Terminaux : adresse, lien d'itinéraire, actif ou non. Changement de terminal avec notification des passagers concernés (mêmes canaux).
- **Info trafic** : message, niveau (information, alerte), dates de début et de fin, lien. Affiché sur l'application client.

### 3.3 Inventaire et tarifs — yield management

#### Principe retenu

- Chaque traversée a, pour chaque famille tarifaire (Éco, Standard, Flex), une suite de **paliers de prix** du moins cher au plus cher, chacun avec un **quota** de places.
- Les paliers sont **imbriqués** : la vente se fait toujours au palier ouvert le moins cher ; quand son quota est vendu, il se ferme et le suivant s'ouvre. Un palier plus cher ne se ferme jamais avant un moins cher.
- Le Flex reste toujours vendable tant qu'il reste des places : c'est la dernière place que l'on vend.
- Prix plancher et prix plafond par famille et par sens : aucune règle ne peut en sortir.

#### Grille tarifaire de référence

- Le revenue manager définit une grille modèle (exemple : Éco palier 1 à 3, Standard palier 1 à 4, Flex palier unique) avec prix adulte, enfant, bébé et quotas.
- La grille est appliquée automatiquement à chaque nouvelle traversée, puis ajustable traversée par traversée.

#### Règles automatiques

Une règle combine des conditions et une action, par exemple :
- Si remplissage < 30 % à J-7 → rouvrir le palier Éco 1 avec 10 places.
- Si remplissage > 70 % à J-10 → fermer les paliers Éco.
- Si le rythme de vente dépasse la courbe de référence de 20 % → passer au palier supérieur en Standard.
- À J-1 → fermer l'Éco.

Contraintes :
- Une règle a une priorité, une période de validité, un périmètre (sens, jours, navire) et un état actif ou inactif.
- Mode **suggestion** (le revenue manager valide) ou mode **automatique**. Au démarrage, tout est en mode suggestion.
- Toute action d'une règle est historisée avec la règle qui l'a déclenchée.
- Un prix déjà bloqué par un client (compte à rebours de 15 min) ne change pas.

#### Simulation

- Avant d'activer une règle ou une grille : application aux traversées passées sur une période choisie, puis comparaison de la recette, du remplissage et de la recette par siège offert, réels et simulés.
- La simulation repose sur les ventes réellement enregistrées. Tant qu'il n'y a pas d'historique (au moins 2 à 3 mois de ventes), l'écran l'indique et n'affiche pas de « gain projeté ».

> Le simulateur actuel du prototype calcule un gain qui augmente quelle que soit la règle (baisse de prix comprise) et affiche « IA ACTIVE ». C'est à supprimer : un chiffre de gain doit venir d'un calcul sur des données réelles.

#### Prévision (étape ultérieure)

- Une fois 6 mois d'historique disponibles : courbe de référence calculée par type de traversée (sens, jour de semaine, période de vacances, fêtes).
- Suggestion de quotas par palier à partir de la demande prévue. Toujours en mode suggestion.

#### Vue de travail du revenue manager

- **Calendrier** des traversées du mois : remplissage, palier ouvert, alerte.
- **Fiche traversée** : courbe de réservation contre référence, paliers avec quotas, vendus, restants, prix ; boutons ouvrir / fermer / modifier un palier, avec motif obligatoire.
- **Historique des prix** de la traversée.

### 3.4 Réservations et passagers

- Recherche par référence, téléphone, nom, traversée, statut, période.
- Fiche réservation : passagers et pièces, tarif, options, paiements, envois (e-mail ; SMS et WhatsApp en V2), historique.
- Actions selon les CGT et le tarif : modifier la date, changer un nom, annuler, rembourser (partiel ou total), renvoyer le billet.
- **Manifeste** par traversée : nom, prénom, catégorie, pièce d'identité, statut d'embarquement. Export PDF et Excel pour les autorités portuaires et la police. Format à valider avec LOGIMAR.

### 3.5 Embarquement (application de scan, mobile)

- Connexion de l'agent, choix de la traversée du jour.
- Scan du QR code : vérification de la signature **hors ligne**, puis synchronisation dès que le réseau revient.
- Résultats : valide (affiche les passagers à contrôler avec leur pièce), déjà scanné, autre traversée, annulé, invalide.
- Recherche manuelle par référence ou nom.
- Compteur embarqués / attendus ; clôture de l'embarquement, qui marque les absents.

### 3.6 Ventes en agence

- Même parcours que le site, en version comptoir : recherche, tarifs du palier ouvert, passagers, encaissement.
- Encaissement : espèces, Airtel Money, Moov Money.
- Caisse par agent et par jour : ouverture, fond de caisse, clôture, écart.
- Impression du billet (ticket thermique ou A4) et envoi par e-mail (SMS en V2).

### 3.7 Paiements et comptabilité

- Liste des paiements avec statut de l'opérateur (Airtel, Moov), référence, montant, frais.
- Journal des envois par réservation (e-mail en V1 ; SMS et WhatsApp en V2), avec renvoi manuel.
- Rapprochement automatique avec les relevés de chaque opérateur (import ou API) ; liste des écarts.
- Factures et avoirs : registre numéroté, export.
- Remboursements : demande, validation, exécution, suivi.
- Exports comptables mensuels (CSV ou Excel).

### 3.8 Rapports

- Rapport de traversée (après le départ) : passagers, recette, répartition par tarif, absents, options.
- Rapport mensuel : recette, remplissage, comparaison avec le mois précédent et la même période de l'année précédente.
- Envoi automatique par e-mail à la direction (hebdomadaire et mensuel).

### 3.9 Paramètres

- Catégories de passagers et bornes d'âge, familles tarifaires et conditions, options et prix, durée du blocage, délais de modification.
- Modèles d'e-mail (V1), de SMS et de WhatsApp (V2).
- Utilisateurs et rôles.

## 4. Données ajoutées au modèle de la phase 1

```
Utilisateur(id, nom, email, telephone, role, actif, mfa_actif)
JournalAudit(id, utilisateur_id, entite, entite_id, action, avant_json, apres_json, motif, created_at)
GrilleTarifaire(id, nom, sens, valide_du, valide_au)
GrilleTarifairePalier(id, grille_id, famille_id, rang, prix_adulte, prix_enfant, prix_bebe, quota)
RegleYield(id, nom, priorite, perimetre_json, conditions_json, action_json, mode[suggestion|auto],
           actif, valide_du, valide_au)
DeclenchementRegle(id, regle_id, traversee_id, action_json, statut[proposee|appliquee|refusee], valide_par, created_at)
ScanEmbarquement(id, passager_id, traversee_id, agent_id, resultat, scanne_at, synchronise_at)
Caisse(id, agent_id, agence, ouverte_at, fermee_at, fond_initial, total_especes, ecart)
Remboursement(id, reservation_id, montant, motif, statut, valide_par, execute_at)
InstantaneTraversee(id, traversee_id, jour_avant_depart, passagers, recette, created_at)
```

`InstantaneTraversee` enregistre chaque nuit l'état de chaque traversée à venir. C'est ce qui permet de tracer les courbes de réservation et de faire des simulations sérieuses. Il faut le mettre en place **dès la mise en ligne de la phase 1**, même si le back-office vient plus tard.

## 5. Exigences techniques

- Même dépôt Next.js que l'application client, routes `/admin` et `/scan` protégées.
- Base relationnelle (PostgreSQL recommandé). Les calculs de prix et de disponibilité se font **côté serveur, dans une transaction**, pour éviter de vendre deux fois la même place.
- Tâches planifiées : expiration des blocages, application des règles de yield, instantanés nocturnes, rapports automatiques.
- Application de scan en PWA installable, fonctionnelle hors ligne.
- Tableaux de bord : requêtes agrégées côté serveur, pas de calcul sur le navigateur à partir de toutes les réservations.
- Sauvegardes quotidiennes de la base, restauration testée.
- Données personnelles (pièces d'identité) : accès limité par rôle, chiffrement au repos, durée de conservation à fixer. Vérifier les obligations de la réglementation gabonaise sur les données personnelles.
- **Tarification** : les tarifs passagers sont libres au Gabon (confirmé par LOGIMAR le 14/11/2026). Les seules bornes du yield sont les prix plancher et plafond fixés en interne.

## 6. Écrans à concevoir (avant le code)

1. Tableau de bord direction.
2. Calendrier des traversées (vue revenue manager).
3. Fiche traversée avec courbe de réservation et paliers.
4. Éditeur de grille tarifaire.
5. Éditeur de règles et simulation.
6. Liste et fiche des réservations.
7. Manifeste.
8. Application de scan (mobile).
9. Vente au comptoir.
10. Paiements et rapprochement.

Format : écrans d'ordinateur, sauf scan et vente au comptoir (tablette et mobile). Même charte que l'application client (`DESIGN_TOKENS.md`), en version plus dense.

## 7. Découpage proposé

| Lot | Contenu | Condition |
|---|---|---|
| 2.1 | Rôles, programme, info trafic, réservations, manifeste, scan | Phase 1 en production |
| 2.2 | Grille tarifaire, paliers et quotas manuels, tableau de bord | Lot 2.1 |
| 2.3 | Ventes en agence, caisse, paiements et rapprochement | Comptes marchands Airtel et Moov actifs |
| 2.4 | Règles automatiques (mode suggestion), simulation | 2 à 3 mois de ventes |
| 2.5 | Prévision, courbes de référence calculées, mode automatique | 6 mois de ventes |

## 8. Critères d'acceptation

- Impossible de vendre plus que la capacité vendable, y compris avec des ventes simultanées web et agence (test de charge).
- La vente se fait toujours au palier ouvert le moins cher de la famille choisie.
- Toute modification de prix ou de quota apparaît au journal d'audit avec son auteur et son motif.
- Le manifeste exporté correspond exactement aux passagers payés de la traversée.
- Le scan fonctionne sans réseau et synchronise sans doublon.
- Chaque indicateur du tableau de bord se recalcule à l'identique à partir de la liste détaillée qui le compose.
- Aucun chiffre projeté n'est affiché sans historique suffisant.

## 9. Questions ouvertes pour LOGIMAR

- Nombre d'agences et d'agents ; ventes par téléphone pratiquées ou non.
- Format du manifeste exigé par les autorités.
- Frais marchands et délais de reversement Airtel Money et Moov Money.
- Politique de surréservation (recommandation : aucune au départ).
- Qui valide les changements de prix (revenue manager seul ou direction).
