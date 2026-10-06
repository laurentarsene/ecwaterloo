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
| `/bienvenue` | `bienvenue.html` | `src/pages/bienvenue.html` (14 langues) |
| `/confidentialite/` | `confidentialite/index.html` | `src/pages/confidentialite.html` |
| page 404 | `404.html` | `src/pages/404.html` |
| `/admin.html` | `admin.html` | écrit à la main (espace bénévoles) |

## Modifier une page

1. Modifier le contenu dans `src/pages/…`, le header/menu dans `src/layout.html`, le footer ou les modales dans `src/partials/`.
2. Lancer `node build.mjs` : les fichiers HTML servis sont régénérés. (Un hook git le fait aussi automatiquement avant chaque commit : `git config core.hooksPath .githooks`, déjà réglé sur cette machine.)
3. Ne jamais modifier directement `index.html`, `aide/index.html`, etc. : ils sont écrasés à chaque génération.

Les liens `href="#ancre"` sont réécrits automatiquement vers la bonne page (`#rdv` devient `/aide/#rdv` ailleurs que sur `/aide/`).

## Après une modification de `styles/site.css` ou des scripts

Augmenter le numéro correspondant dans `V` en haut de `build.mjs`, puis relancer `node build.mjs` (pour `styles/admin.css`, augmenter le `?v=` dans `admin.html`). Sinon, les visiteurs déjà venus gardent l'ancienne version en cache.

## Épicerie étudiante

- Date par défaut : le 1er jeudi du mois.
- Exception ponctuelle : ajouter `'AAAA-MM': jour` dans `config.js` **et** dans `supabase/functions/send-reminders/index.ts`, puis redéployer la fonction (`supabase functions deploy send-reminders`).

## Ajouter une gazette (N°3, N°4…)

1. Déposer le PDF dans `assets/magazines/gazette-03.pdf` et la couverture (JPG, environ 900 px de large) dans `assets/magazines/gazette-03-cover.jpg`.
2. Dans `src/pages/qui-sommes-nous.html`, section `#gazette` : la nouvelle couverture passe devant (`gaz__cover`), la précédente derrière (`gaz__cover gaz__cover--back`), et les deux boutons « Lire le N°… » pointent vers les deux derniers numéros (`data-pdf`, `data-title`, `href`).
3. Mettre à jour la ligne « 2026 · Première Gazette conviviale » de la frise si besoin, puis `node build.mjs`.

## Informations légales et vie privée

- Numéro d'entreprise, adresse, durées de conservation : constante `LEGAL` en haut de `build.mjs` (utilisée par le footer et la page Confidentialité).
- La police (Hanken Grotesk) et les bibliothèques (Supabase, StPageFlip, pdf.js) sont hébergées dans `assets/fonts/` et `assets/vendor/` : aucune requête vers Google Fonts ni vers un CDN tiers.
- Services tiers restants, déclarés dans la page Confidentialité : Supabase, Resend, Cloudflare, Cal.eu, Stripe.

## E-mails automatiques (Supabase)

`supabase/functions/send-email` (confirmation d'inscription) et `send-reminders` (rappel la veille, appelé chaque matin par pg_cron). Après modification : `supabase functions deploy send-email` et `supabase functions deploy send-reminders`.
