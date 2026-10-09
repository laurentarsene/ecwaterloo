# Espace Convivial de Waterloo — site

Site statique (HTML, CSS, JS sans framework), hébergé sur Cloudflare Pages : chaque push sur `main` est mis en ligne.

## Pages

| Adresse | Fichier généré | Source |
|---|---|---|
| `/` | `index.html` | `src/pages/accueil.html` |
| `/aide/` | `aide/index.html` | `src/pages/aide.html` |
| `/etudiants/` | `etudiants/index.html` | `src/pages/etudiants.html` |
| `/aider/` | `aider/index.html` | `src/pages/aider.html` |
| `/benevoles/` | `benevoles/index.html` | `src/pages/benevoles.html` (calendrier public des créneaux) |
| `/qui-sommes-nous/` | `qui-sommes-nous/index.html` | `src/pages/qui-sommes-nous.html` (histoire complète, dates, gazette, abonnement) |
| `/impact/` | `impact/index.html` | `src/pages/impact.html` (chiffres, témoignages, partenaires) |
| `/agenda/` | `agenda/index.html` | `src/pages/agenda.html` (contenu chargé depuis l'admin) |
| `/facile-a-lire/` | `facile-a-lire/index.html` | `src/pages/facile-a-lire.html` |
| `/en/`, `/uk/`, `/ar/` | `en/index.html`… | `src/pages/en.html`… (gabarit `src/layout-langue.html`) |
| `/suivi/?t=…` | `suivi/index.html` | `src/pages/suivi.html` (lien personnel reçu par e-mail : confirmer, annuler, se désabonner) |
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

## Ce qui se gère dans l'admin (`/admin.html`)

Aucune modification de code n'est nécessaire. Six rubriques :

- **Tableau de bord** : ce qui demande une action (bénévoles à valider, prochaine épicerie, créneaux à compléter, Gazette à envoyer, lettres de lutins) et un grand agenda qui réunit l'épicerie étudiante, les créneaux bénévoles et les événements. Glisser un élément sur un autre jour ouvre une fenêtre qui montre les conséquences (qui sera prévenu, doublons, date trop proche) avant d'enregistrer ; les personnes inscrites reçoivent un e-mail avec la nouvelle date.
- **Épicerie étudiante** : la prochaine date (inscriptions, places, liste d'attente), les inscriptions, et les 12 prochains mois (changer la date, le nombre de places, annuler ou rétablir un mois).
- **Bénévoles** : validations, créneaux (un par un, copie, séries), catégories, export CSV.
- **Lutins de Noël** : suivi des lettres et des cadeaux.
- **Contenus du site** : agenda et nouvelles, besoins du moment, Gazette (mise en ligne et envoi aux abonné·es), chiffres de la page Impact.
- **Dons** (super-admins seulement) : balance Stripe, dons des 12 derniers mois, dons mensuels actifs, virements, export CSV de l'année. Lu en direct chez Stripe, rien n'est stocké dans la base.
- **Réglages** : ouverture des inscriptions étudiantes, places par défaut, objectif des lutins, adresse des alertes.

Une **visite guidée** se lance à la première connexion de chaque compte (mémorisé dans le compte) ; le bouton « Visite guidée » du menu la relance (`scripts/admin-tuto.js`).

**Super-admin** : rôle posé dans les métadonnées système du compte (impossible à modifier depuis le site), via l'éditeur SQL de Supabase :

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"super_admin"}'::jsonb where email = 'adresse@exemple.be';
```

La personne se déconnecte puis se reconnecte. Le serveur vérifie ce rôle à chaque demande de données de dons. La clé Stripe (restreinte, lecture seule : Balance, Charges, Payouts, Subscriptions) se pose avec `supabase secrets set STRIPE_SECRET_KEY=rk_live_…`.

**Dons mensuels** (montant libre, 5 € minimum) : la fonction `ecw-api` crée la page de paiement Stripe pour le montant choisi, sur le produit « Don mensuel » (`prod_VPOXRJMFgQMZp4`). Secret : `STRIPE_CHECKOUT_KEY` (clé restreinte, Checkout Sessions en écriture). Le lien de l'espace client Stripe se règle dans `DONS_MENSUELS`, en haut de `build.mjs` ; vide, le choix « Chaque mois » est masqué.

Tout compte créé dans Supabase Auth est administrateur : garder « Allow new users to sign up » désactivé et créer les comptes à la main (Authentication › Users › Add user).

## Parcours automatiques

- **Étudiant·e** : inscription → confirmation (ou liste d'attente) avec fichier agenda → rappel la veille. Annulation par le lien du mail : la place passe à la première personne en attente, qui reçoit un e-mail.
- **Bénévole** (sans compte) : choix d'un ou plusieurs créneaux de la même activité (coordonnées retenues sur l'appareil pour la fois suivante) → e-mail « confirmez » → l'admin reçoit « À valider » → validation ou refus dans l'admin (avec un mot facultatif) → e-mail + fichier agenda → rappel la veille avec « Je serai là / Je ne peux plus venir ». Une demande non confirmée en 48 h expire et libère la place. Plusieurs dates choisies ensemble forment un « lot » : un seul e-mail de confirmation, une seule alerte, une validation groupée. L'équipe peut aussi inscrire quelqu'un qui a appelé, désinscrire à la demande de la personne, et noter les présences.
- **Gazette** : abonnement avec double confirmation, envoi depuis l'admin, désinscription en un clic.
- **Lutin·e** : inscription → e-mail de remerciement (étapes à venir) + alerte à l'équipe.

Tous les e-mails partagent le gabarit de `supabase/functions/_shared/mail.ts` (logo, illustration de `assets/images/email/`, carte de rendez-vous, étapes, version texte automatique) ; leurs textes sont dans `modeles.ts`.

## Informations légales et vie privée

- Numéro d'entreprise, adresse, durées de conservation : constante `LEGAL` en haut de `build.mjs` (utilisée par le footer et la page Confidentialité).
- La police (Hanken Grotesk) et les bibliothèques (Supabase, StPageFlip, pdf.js) sont hébergées dans `assets/fonts/` et `assets/vendor/` : aucune requête vers Google Fonts ni vers un CDN tiers.
- Services tiers restants, déclarés dans la page Confidentialité : Supabase, Resend, Cloudflare, Cal.eu, Stripe.

## Supabase (base de données et e-mails)

- `supabase/migrations/` : schéma de la base. `20261001000000_base.sql` est l'état initial (déjà en production), `20261007000000_ecw_v2.sql` ajoute tout ce qui précède, `20261008000000_benevoles_lots.sql` regroupe les inscriptions faites ensemble.
- `supabase/functions/ecw-api` : toutes les inscriptions publiques et les actions des liens personnels (le public ne lit jamais de données personnelles).
- `supabase/functions/send-reminders` : rappels de la veille et expiration des demandes non confirmées, appelée chaque matin par pg_cron.
- `supabase/functions/_shared/` : envoi via Resend et modèles des e-mails.

Après modification : `supabase functions deploy ecw-api` et `supabase functions deploy send-reminders`.

### Tester en local

Docker requis. Les ports sont décalés (553xx) pour cohabiter avec d'autres projets.

```
supabase start
supabase functions serve --env-file supabase/functions/.env --no-verify-jwt
```

Avec `MAIL_OUTBOX=1` dans `supabase/functions/.env`, aucun e-mail ne part : ils sont écrits dans la table `dev_outbox` (visible dans le Studio local, http://127.0.0.1:55323).
