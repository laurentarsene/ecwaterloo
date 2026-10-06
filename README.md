# Espace Convivial de Waterloo — site

Site statique (HTML, CSS, JS sans framework), hébergé sur Cloudflare Pages : chaque push sur `main` est mis en ligne.

## Pages

| Adresse | Fichier généré | Source |
|---|---|---|
| `/` | `index.html` | `src/pages/accueil.html` |
| `/aide/` | `aide/index.html` | `src/pages/aide.html` |
| `/etudiants/` | `etudiants/index.html` | `src/pages/etudiants.html` |
| `/aider/` | `aider/index.html` | `src/pages/aider.html` |
| `/qui-sommes-nous/` | `qui-sommes-nous/index.html` | `src/pages/qui-sommes-nous.html` (histoire complète, dates, gazette) |
| `/bienvenue` | `bienvenue.html` | écrit à la main (14 langues) |
| `/admin.html` | `admin.html` | écrit à la main (espace bénévoles) |

## Modifier une page

1. Modifier le contenu dans `src/pages/…`, le header/menu dans `src/layout.html`, le footer ou les modales dans `src/partials/`.
2. Lancer `node build.mjs` : les fichiers HTML servis sont régénérés.
3. Ne jamais modifier directement `index.html`, `aide/index.html`, etc. : ils sont écrasés à chaque génération.

Les liens `href="#ancre"` sont réécrits automatiquement vers la bonne page (`#rdv` devient `/aide/#rdv` ailleurs que sur `/aide/`).

## Après une modification de `styles/site.css` ou des scripts

Augmenter le numéro correspondant dans `V` en haut de `build.mjs` (et dans `bienvenue.html` pour le CSS), puis relancer `node build.mjs`. Sinon, les visiteurs déjà venus gardent l'ancienne version en cache.

## Épicerie étudiante

- Date par défaut : le 1er jeudi du mois.
- Exception ponctuelle : ajouter `'AAAA-MM': jour` dans `config.js` **et** dans `supabase/functions/send-reminders/index.ts`, puis redéployer la fonction (`supabase functions deploy send-reminders`).
