# Dossier LOGIMAR 241 — pour Claude Code

Mis à jour le 14 novembre 2026.

**Étape en cours : démonstration** à présenter au fondateur de LOGIMAR. Production (nom de domaine, hébergement, base de données, comptes marchands, prestataire d'e-mails) seulement après validation.

## Contenu

| Fichier | Rôle |
|---|---|
| `PROMPT_CLAUDE_CODE.md` | Le prompt de départ à copier-coller dans Claude Code. |
| `PERIMETRE_DEMO.md` | **Ce qu'il faut livrer maintenant** : réel / simulé, données d'exemple, critères de fin. Fait foi pour la démo. |
| `ETAT_DU_DEPOT.md` | Analyse du dépôt `ten-mukass/LOGIMAR_DEMO` : ce qui existe, ce qui manque, ce qui est faux. |
| `CAHIER_DES_CHARGES_RESERVATION.md` | Application client complète (production) : écrans, règles de gestion, paiement Airtel/Moov, billet, facture, compte, modèle de données. |
| `CAHIER_DES_CHARGES_GESTION.md` | Back-office complet (production) : yield management, tableaux de bord, scan, agences. |
| `DESIGN_TOKENS.md` | Charte : couleurs, polices, formes, variables CSS. |
| `ANALYSE_CONCURRENCE.md` | Comparaison avec NGV Lines. |
| `maquettes/` | Écrans en HTML autonome (`index.html` pour naviguer) et en PNG (`png/`). |
| `assets/` | Logo LOGIMAR 241, Victoria Jet, logos Airtel Money et Moov Money, affiches de programme. |

Maquettes d'origine (canevas Claude Design, accès privé) : https://claude.ai/artifact/JStk6REJCWcA11wM6BNpus

## Décisions validées

- Trois tarifs : Éco, Standard, Flex. Tarifs passagers libres au Gabon.
- Paiement : Airtel Money et Moov Money en direct (pas de carte bancaire au départ).
- V1 : billet et facture dans l'application et par e-mail ; SMS et WhatsApp en V2.
- Le client donne au moins un téléphone ou un e-mail ; réservation sans compte ; compte proposé après le paiement.

## Ordre de travail

1. Démo : parcours client (voir `PERIMETRE_DEMO.md`).
2. Démo : aperçu du back-office branché sur les mêmes données.
3. Présentation à LOGIMAR.
4. Production : base, paiements réels, e-mails, nom de domaine.
5. V2 : SMS, WhatsApp, back-office complet.
