# LOGIMAR 241 — Charte de l'application

Source : logo LOGIMAR 241 (drapeau gabonais, orque) et affiches « Programme du mois ».
Maquettes : https://claude.ai/artifact/JStk6REJCWcA11wM6BNpus

## Couleurs

| Nom | Hex | Usage |
|---|---|---|
| Marine | `#0F3A73` | En-têtes, titres, fond du billet |
| Marine clair | `#1C4A88` | Boutons sur fond marine |
| Océan | `#0B7CC1` | Logo, icônes, traits de trajet, grands textes |
| Action | `#0A64A4` | Boutons principaux, liens, sélection |
| Forêt | `#0E9A48` | Fonds décoratifs, pictos |
| Forêt texte | `#0B7A3A` | Succès, « Confirmé », étape validée |
| Soleil | `#F3E12B` | Info trafic, badges, date sélectionnée |
| Soleil pâle | `#FFF8CF` (bordure `#E8D43A`) | Alertes douces |
| Encre | `#12233B` | Texte courant |
| Gris texte | `#4A5B72` | Texte secondaire |
| Écume | `#F3F7FB` | Fond d'écran |
| Bordure | `#D9E3EE` | Cartes ; champs `#C5D3E3` |
| Bleu pâle | `#EAF3FB` | Fond d'élément sélectionné |
| Vert pâle | `#E3F4EA` | Fond de badge succès |
| Alerte | `#A23A16` sur `#FDE8E1` | « Plus que N places à ce prix » |

Contraste : texte blanc seulement sur Marine, Action ou Forêt texte. Sur Soleil, texte Marine. Pas de petit texte blanc sur Océan ni sur Forêt.

## Typographie

- Titres, prix, heures : **Montserrat** 700–800 (Google Fonts).
- Texte : **Inter** 400–700.
- Échelle mobile : 30 / 22 / 19 / 17 / 16 / 15 / 14 / 13 / 12 px.
- Chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour heures et prix.

## Formes et espacements

- Rayons : 10–12 px (champs, boutons), 14–18 px (cartes), 22–28 px (billet, bas d'en-tête).
- Espacements : grille de 4 px (8, 12, 16, 24, 32, 48). Marges écran mobile 16–20 px.
- Hauteurs : champs 48 px, boutons principaux 52–54 px, navigation basse 72 px.
- Ombre de la carte de recherche : `0 10px 30px rgba(15,58,115,0.16)`.

## Icônes

Icônes au trait (style Lucide/Feather), épaisseur 2, pas d'emoji.

## Tokens (CSS)

```css
:root {
  --c-marine: #0F3A73;
  --c-marine-2: #1C4A88;
  --c-ocean: #0B7CC1;
  --c-action: #0A64A4;
  --c-foret: #0E9A48;
  --c-foret-texte: #0B7A3A;
  --c-soleil: #F3E12B;
  --c-soleil-pale: #FFF8CF;
  --c-encre: #12233B;
  --c-gris: #4A5B72;
  --c-ecume: #F3F7FB;
  --c-bordure: #D9E3EE;
  --c-bordure-champ: #C5D3E3;
  --c-bleu-pale: #EAF3FB;
  --c-vert-pale: #E3F4EA;
  --c-alerte: #A23A16;
  --c-alerte-pale: #FDE8E1;
  --font-titre: "Montserrat", sans-serif;
  --font-texte: "Inter", system-ui, sans-serif;
  --r-champ: 12px;
  --r-carte: 16px;
  --r-billet: 22px;
}
```
