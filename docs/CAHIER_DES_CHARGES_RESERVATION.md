# LOGIMAR 241 — Cahier des charges de l'application de réservation

Version 1.0 — 14 novembre 2026
Périmètre : application client de réservation (phase 1). L'application de gestion avec yield management et tableaux de bord est la phase 2 : elle n'est pas à coder maintenant, mais le modèle de données de la phase 1 doit déjà la permettre (section 7).

**Étape en cours : démonstration.** Ce document décrit la cible de production ; ce qui est réel ou simulé dans la démo est fixé par `PERIMETRE_DEMO.md`, qui prime en cas de doute.

Maquettes de référence : dossier `maquettes/` (HTML et PNG) ; canevas Claude Design : https://claude.ai/artifact/JStk6REJCWcA11wM6BNpus
Charte graphique : `DESIGN_TOKENS.md`. Visuels : dossier `assets/`.

---

## 1. Contexte

- LOGIMAR 241 (Logistique Maritime 241) exploite le catamaran **Victoria Jet** entre **Libreville (LBV)** et **Port-Gentil (POG)**.
- Concurrent direct : NGV Lines (ngvlines.ga). Objectif : un parcours plus simple et plus rapide, adapté au mobile et au paiement Mobile Money.
- Point de départ : le dépôt `ten-mukass/LOGIMAR_DEMO` (Next.js 16, React 19, TypeScript, Tailwind 4, déployé sur Vercel). On garde sa stack et on refond le parcours selon ce document. Détail du code existant : `ETAT_DU_DEPOT.md`.

### Décisions validées (14 novembre 2026)

- Trois familles tarifaires : **Éco, Standard, Flex** (conditions en 4.3). Les prix et délais restent à fournir par LOGIMAR.
- Tarifs passagers **libres** (pas d'encadrement réglementaire) : le yield management n'a pas d'autre limite que les planchers et plafonds fixés par LOGIMAR.
- Paiement : **intégration directe Airtel Money et Moov Money**, sans agrégateur (section 4.4).
- V1 : billet et facture **dans l'application** et **par e-mail** ; SMS et WhatsApp en **V2**. Le client donne au moins un téléphone ou un e-mail ; création de compte proposée juste après le paiement (section 4.5).

## 2. Principes

- **Mobile d'abord** : largeur de référence 390 px, puis adaptation tablette et ordinateur.
- **Sans compte** : on réserve avec un numéro de téléphone. Le compte client reste optionnel (phase ultérieure).
- **Faible connexion** : pages légères, billet consultable hors ligne (PWA).
- **Aucune donnée fictive en production** : tarifs, horaires, terminaux et capacités viennent de la base, administrables.
- **Français par défaut, anglais en option.**
- **Accessibilité** : contraste AA, cibles tactiles de 48 px minimum, vrais boutons et libellés de champs.

## 3. Écrans et parcours

| N° | Écran | Contenu clé |
|---|---|---|
| 1 | Accueil | Bandeau info trafic administrable ; formulaire aller simple ou aller-retour, départ/arrivée inversables, date, passagers par catégorie ; prochaines traversées ; présentation du Victoria Jet ; infos pratiques ; appel direct aux agences ; navigation basse (Réserver, Horaires, Mes billets, Aide). |
| 2 | Résultats | Bande de dates limitée aux jours de traversée, avec le prix « dès » de chaque jour et la mention du jour le moins cher ; carte de la traversée (heures, durée calculée, places restantes, heure d'enregistrement, terminal) ; choix du **tarif** (Éco, Standard, Flex) avec conditions et alerte « plus que N places à ce prix » ; détail du prix ; barre basse avec total et Continuer. |
| 3 | Passagers | Contact (téléphone ou e-mail, au moins l'un des deux) ; une fiche par passager : nom, prénom, type et numéro de pièce d'identité pour les adultes ; date de naissance pour enfants et bébés, rappel de l'acte de naissance ; case « Je suis ce passager ». |
| 4 | Options et paiement | Compte à rebours de blocage des places et du tarif ; options (bagage supplémentaire, garantie) ; Airtel Money, Moov Money ; récapitulatif ; acceptation des CGT et de la politique de confidentialité ; bouton Payer. |
| 5 | Billet | Confirmation ; référence ; trajet, date, heures ; enregistrement mis en avant ; QR code ; liste des passagers ; PDF, partage WhatsApp, itinéraire vers le terminal. |
| 6 | Horaires | Calendrier du mois par jour de traversée (mardi, vendredi, dimanche), dates passées barrées, dates futures cliquables vers les résultats ; programme type par sens. |
| 7 | Mes billets | Recherche par référence + téléphone ou e-mail ; billets enregistrés sur l'appareil. |

Pages de contenu à prévoir (texte à fournir par LOGIMAR) : bagages, formalités et pièces d'identité, enfants et mineurs non accompagnés, accessibilité, femmes enceintes, FAQ, contact, CGT, mentions légales, confidentialité, cookies.

## 4. Règles de gestion

### 4.1 Passagers
- Catégories : **Adulte** (12 ans et plus), **Enfant** (3 à 11 ans), **Bébé** (0 à 2 ans). Bornes à confirmer par LOGIMAR.
- Au moins 1 adulte par réservation. Bébés : au plus 1 par adulte.
- Le nombre et le type de passagers doivent rester dans l'état de la réservation (URL ou store) d'un écran à l'autre. C'est un défaut du prototype actuel, à corriger.

### 4.2 Traversées
- Une traversée = un navire + un sens + une date + une heure de départ + une heure d'arrivée + une heure d'ouverture et de fermeture de l'enregistrement + un terminal de départ et d'arrivée.
- La **durée est calculée** (arrivée − départ), jamais saisie à la main.
- Programme connu (à confirmer) :
  - Départ Libreville : enregistrement 09:30, départ 12:15, arrivée 15:45.
  - Départ Port-Gentil : enregistrement 05:25, départ 07:25, arrivée 11:00.
  - Jours : mardi, vendredi, dimanche (programme d'octobre 2026).
- Le calendrier ne propose que les dates avec au moins une traversée ouverte à la vente.
- Les **terminaux sont administrables**. Exemple : le Port-Môle de Libreville est fermé pour travaux et l'embarquement des NGV se fait au CAPAL ; vérifier le terminal utilisé par LOGIMAR.

### 4.3 Tarifs (compatibles yield management)
- Le prix n'est pas une constante : il dépend de la traversée, de la catégorie de passager, de la famille tarifaire et d'une **classe de réservation** (palier de prix) ouverte ou fermée.
- Familles tarifaires affichées au client :
  - **Éco** : prix le plus bas, ni modifiable ni remboursable, quota limité.
  - **Standard** : modifiable avec frais jusqu'à [DÉLAI] avant le départ.
  - **Flex** : modifiable sans frais, remboursable, embarquement prioritaire.
- À chaque recherche, l'application affiche le prix du palier ouvert le moins cher pour chaque famille. Quand un palier est épuisé, le suivant (plus cher) s'ouvre automatiquement.
- Le prix est **figé au moment du blocage** (étape paiement) pendant 15 minutes. À l'expiration, les places sont libérées et le prix est recalculé.
- Montants en FCFA, entiers, sans décimales.

### 4.4 Réservation et paiement
- Statuts : `brouillon` → `bloquée` (places retenues, compte à rebours) → `payée` → `émise` ; plus `expirée`, `annulée`, `remboursée`, `embarquée`, `absente`.
- Moyens de paiement : **Airtel Money** et **Moov Money**, intégrés directement chez chaque opérateur. La carte bancaire est retirée du périmètre initial (à réintroduire plus tard si besoin).
- Parcours : le serveur envoie une demande de paiement sur le téléphone du client ; le client valide avec son code secret ; l'opérateur confirme par **callback (webhook)** au serveur. Le billet n'est émis qu'après cette confirmation serveur, jamais sur la seule réponse du navigateur.
- **Filet de sécurité** : en l'absence de callback, le serveur interroge le statut de la transaction (toutes les 10 s pendant 3 min, puis par tâche planifiée) avant de déclarer le paiement échoué.
- **Idempotence** : une référence de transaction unique par tentative ; un même paiement ne peut pas émettre deux billets ; un callback reçu deux fois est ignoré la seconde fois.
- **Architecture** : une interface commune `PaymentProvider` (`initierPaiement`, `consulterStatut`, `traiterCallback`, `rembourser`), avec trois implémentations : `AirtelMoneyProvider`, `MoovMoneyProvider` et `SimulatedProvider` (tests et démonstration). Le parcours client ne connaît que l'interface.
- Clés et secrets uniquement en variables d'environnement côté serveur ; callbacks vérifiés (signature ou liste d'adresses autorisées, selon ce que fournit chaque opérateur).

#### Airtel Money — ce qui est connu

- Airtel Africa publie une **Open API** sur `developers.airtel.africa` : inscription, application, identifiants `client_id` / `client_secret`, jeton OAuth 2.0, puis API **Collection** qui déclenche la demande de paiement sur le téléphone du client.
- Un environnement de test (sandbox) existe avant passage en production.
- L'API **Collection** permet aussi le remboursement d'une transaction ; l'API **Disbursement** permet de verser de l'argent (remboursements, avoirs).
- Les détails de l'API varient selon les pays : prévoir l'adaptation au Gabon (code pays, devise XAF, format des numéros) lors de l'ouverture du compte marchand.
- Démarche LOGIMAR : compte marchand Airtel Money Gabon + accès API (pièces de l'entreprise demandées).

#### Moov Money — à obtenir

- Aucune documentation publique d'API marchande Moov Money Gabon n'a été trouvée.
- Démarche LOGIMAR : demander à **Moov Africa Gabon Télécom** l'accès à l'API de paiement marchand (documentation, environnement de test, frais, délai de reversement).
- Si l'opérateur ne fournit pas d'API directe dans les délais : solution de repli par un agrégateur **pour Moov uniquement**, branché derrière la même interface `MoovMoneyProvider`.
- En attendant : `MoovMoneyProvider` est livré en mode simulé, désactivable dans l'interface (Moov masqué tant qu'il n'est pas actif).

### 4.5 Envoi du billet, facture et compte client

**Contact obligatoire** : à l'étape Passagers, le client renseigne **au moins un** des deux : téléphone ou e-mail. Ce contact sert à retrouver le billet (avec la référence) et, pour l'e-mail, à l'envoi. Le numéro de paiement Mobile Money est saisi à part, à l'étape Paiement (il peut être celui d'un tiers).

**Canaux par version**

| Canal | V1 | V2 |
|---|---|---|
| Application / site | Oui : billet (QR), facture, téléchargement PDF ; accès par référence + téléphone ou e-mail | Oui |
| E-mail | Oui, si l'adresse est saisie : billet PDF + facture PDF | Oui |
| SMS | Non | Oui : référence, trajet, heure d'enregistrement, lien vers le billet |
| WhatsApp | Non | Oui, via WhatsApp Business Platform (compte vérifié, modèle « utilitaire » validé par Meta, accord du client) : billet et facture PDF |

Conséquences pour la V1 :
- Un client qui n'a saisi qu'un téléphone ne reçoit rien automatiquement : l'écran de confirmation doit donc mettre en avant la **référence**, les boutons **Billet PDF** et **Facture PDF**, et l'enregistrement du billet sur l'appareil (PWA, consultable hors ligne).
- Le code doit déjà passer par un module d'envoi unique (`NotificationService`, file d'attente, journal `Envoi`) avec le seul canal e-mail actif : SMS et WhatsApp s'ajouteront en V2 sans toucher au parcours.
- Un échec d'envoi d'e-mail ne bloque jamais l'émission du billet.

**Facture**

- Générée automatiquement en PDF à la confirmation du paiement, numérotée de façon séquentielle et sans trou (ex. `F-2026-000123`), jamais modifiée après émission (un remboursement produit un avoir).
- Mentions à fournir par LOGIMAR : raison sociale, adresse, NIF, RCCM, régime de TVA applicable au transport de passagers, mentions légales obligatoires.
- Contenu : client (nom, téléphone et/ou e-mail), réservation, détail par passager et par option, moyen de paiement et référence opérateur, total.

**Compte client**

- La réservation reste possible **sans compte**.
- Juste après le paiement, l'écran Billet propose « Créer mon compte » : identifiant = le téléphone ou l'e-mail déjà saisi, le client choisit un **mot de passe**.
  - V1 : si l'identifiant est un e-mail, il est vérifié par un code envoyé par e-mail. Si c'est un téléphone, pas de vérification par SMS en V1 (le SMS arrive en V2).
  - V2 : connexion et vérification par code SMS.
- La création rattache au compte les réservations passées faites avec ce téléphone ou cet e-mail. Pour un téléphone non vérifié (V1), le rattachement ne porte que sur les réservations dont le client fournit aussi la référence.
- Le compte contient : billets à venir et passés, factures, passagers enregistrés (pour pré-remplir), langue.
- Mot de passe oublié : par e-mail en V1 (si e-mail connu), par SMS en V2. Sinon, assistance en agence.
- Suppression du compte possible depuis l'application.

### 4.6 Billet
- Référence courte lisible (format proposé `LGM-XXXXX`, sans caractères ambigus O/0, I/1).
- QR code signé (contenu : référence + identifiant de traversée + signature), vérifiable hors ligne à l'embarquement (phase 2 : application de scan).
- Envoi selon les canaux choisis : voir 4.5.

## 5. Contenus et données à fournir par LOGIMAR

- Grille tarifaire par catégorie et par famille, paliers et quotas.
- Capacité du Victoria Jet (et classe VIP éventuelle) ; plan de salle si placement numéroté.
- Terminal d'embarquement à Libreville et à Port-Gentil, avec lien d'itinéraire.
- Horaires du vendredi et calendrier des prochains mois.
- Franchise bagages (soute, cabine), prix du bagage supplémentaire.
- Conditions de modification et d'annulation (CGT).
- Compte marchand et accès API Airtel Money Gabon ; accès API Moov Money auprès de Moov Africa Gabon Télécom.
- Prestataire d'envoi d'e-mails (V1). Compte WhatsApp Business vérifié et prestataire SMS (V2).
- Mentions légales de la facture (NIF, RCCM, régime de TVA).
- Textes des pages d'information.
- Numéros d'agences (repris des affiches, à confirmer) : Port-Gentil (+241) 65 95 90 20 / 21 ; Libreville (+241) 65 95 90 15 / 16.

## 6. Corrections à reporter depuis le prototype actuel

- Supprimer « Port Môle » codé en dur comme départ par défaut.
- Conserver le nombre de passagers après la recherche.
- Une fiche d'identité par passager (aujourd'hui un seul nom).
- Durées fausses (13:00 → 16:30 affiché 3h00) : calcul automatique.
- Numéros de sièges illisibles ; supprimer le choix du siège tant que le plan du Victoria Jet n'est pas fourni.
- Liens Horaires, Mes réservations, Contact en `#` : à brancher.
- Retirer les partenaires (Canal+, Airtel, Moov, Sobraga), l'offre « -50 % Airtel Money » et « Meilleur prix garanti » sauf accord écrit de LOGIMAR.
- Retirer « Simulateur Yield Actif » de l'interface client.

## 7. Modèle de données minimal (prêt pour la phase 2)

```
Port(id, code, nom, ville)
Terminal(id, port_id, nom, adresse, lien_itineraire, actif)
Navire(id, nom, capacite_totale, plan_salle_json?)
Ligne(id, port_depart_id, port_arrivee_id)
Traversee(id, ligne_id, navire_id, terminal_depart_id, terminal_arrivee_id,
          depart_at, arrivee_at, enregistrement_ouverture_at, enregistrement_fermeture_at,
          statut[programmee|ouverte|fermee|annulee|partie], capacite_vendable)
FamilleTarifaire(id, code[ECO|STD|FLEX], nom, modifiable, remboursable, frais_modif, delai_modif_h, avantages)
ClasseReservation(id, traversee_id, famille_id, rang, prix_adulte, prix_enfant, prix_bebe,
                  quota, vendus, ouverte)            -- paliers de yield
Reservation(id, reference, traversee_id, famille_id, classe_id, statut, telephone?, email?,   -- au moins l'un des deux
            total, devise, bloquee_jusqu_a, canal[web|agence|telephone], created_at)
Passager(id, reservation_id, categorie, nom, prenom, date_naissance?, type_piece?, numero_piece?, embarque_at?)
Option(id, code, libelle, prix)  ReservationOption(reservation_id, option_id, quantite, prix_unitaire)
Paiement(id, reservation_id, moyen[airtel|moov], montant, statut, ref_transaction, ref_operateur, payload, created_at)
Client(id, telephone?, telephone_verifie_at?, email?, email_verifie_at?, mot_de_passe_hash, langue, created_at)
PassagerEnregistre(id, client_id, categorie, nom, prenom, date_naissance?, type_piece?, numero_piece?)
Facture(id, numero, reservation_id, montant, pdf_url, emise_at)   Avoir(id, numero, facture_id, montant, motif, emis_at)
Envoi(id, reservation_id, canal[sms|whatsapp|email], destinataire, statut, tentatives, erreur?, envoye_at)
CodeVerification(id, canal[email|sms], destinataire, code_hash, expire_at, tentatives)
InfoTrafic(id, message, lien?, niveau, debut_at, fin_at, actif)
HistoriquePrix(id, classe_id, prix, raison, created_at)   -- pour l'analyse yield
```

Les prix restent sur `ClasseReservation`, avec historique : la phase 2 pourra ouvrir et fermer les paliers, modifier les quotas et analyser le remplissage sans changer le schéma.

## 8. Phase 2 — application de gestion (pour mémoire, à spécifier plus tard)

- Gestion du programme : traversées, navires, terminaux, info trafic.
- **Yield management** : paliers et quotas par traversée, règles d'ouverture automatique selon le remplissage et le délai avant départ, simulation, historique.
- Tableaux de bord : remplissage par traversée, chiffre d'affaires, recette moyenne par passager, rythme de réservation (courbe J-30 → J0), répartition par tarif et moyen de paiement, taux d'absence.
- Opérations : liste d'embarquement, scan des QR codes, ventes en agence.
- Rôles : administrateur, revenue manager, agent de vente, agent d'embarquement.

## 9. Critères d'acceptation de la phase 1

- Un parcours complet sur mobile, de l'accueil au billet, en moins de 2 minutes pour 1 passager.
- Aucune date sans traversée n'est sélectionnable.
- Le prix affiché aux résultats est celui facturé, tant que le blocage n'a pas expiré.
- Le billet n'est émis qu'après confirmation du prestataire de paiement (webhook).
- Les données de chaque passager sont saisies et figurent sur le billet.
- Lighthouse mobile : performance ≥ 85, accessibilité ≥ 95.
- Toutes les valeurs entre crochets des maquettes proviennent de la base et sont modifiables sans redéploiement.
