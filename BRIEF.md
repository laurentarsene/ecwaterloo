# BRIEF — Espace Convivial de Waterloo

## Contexte
Site web pour **l'Espace Convivial de Waterloo**, une ASBL basée à Waterloo, Belgique.
Le nom de domaine est déjà réservé. Le design existe sur Figma.

## Stack technique
- **Site statique** : HTML / CSS vanilla (ou Astro si besoin de templating)
- **Hébergement** : Cloudflare Pages, Netlify ou Vercel (déploiement via GitHub)
- **Booking** : embed Cal.com (calendrier de prise de rendez-vous avec gestion des créneaux)
- **Paiement** : Polar.sh (à intégrer plus tard — simple bouton/widget de checkout)

## Architecture
```
/
├── index.html          # Landing page
├── styles/
│   └── main.css        # Styles globaux
├── scripts/
│   └── nav.js          # Menu mobile
├── assets/
│   ├── images/         # Images, logo, photos
│   └── fonts/          # Polices custom si nécessaire
├── BRIEF.md
└── README.md
```

## Fonctionnalités

### Phase 1 — Landing page (maintenant)
- Page vitrine statique fidèle au design Figma
- Responsive (mobile-first)
- Sections typiques : hero, présentation de l'ASBL, services/activités, contact, footer
- SEO de base (meta tags, Open Graph)
- Performances : tout statique, pas de JS inutile

### Phase 2 — Booking (prochaine étape)
- Intégration Cal.com en embed ou lien
- La gestionnaire (maman) définit ses disponibilités
- Les visiteurs réservent un créneau → le créneau devient indisponible pour les autres
- Confirmation par email automatique via Cal.com

### Phase 3 — Paiement (plus tard)
- Intégration Polar.sh sur la landing page
- Bouton ou widget de checkout pour les paiements

## Design
⚠️ Le design Figma n'a pas encore été partagé ici.
Quand disponible, ajouter les screenshots dans `/assets/design/` et décrire les sections ci-dessous :

- **Palette de couleurs** : à compléter
- **Typographie** : à compléter
- **Sections de la page** : à compléter

## Notes
- Garder le code le plus simple possible — c'est un petit site vitrine
- Langue du site : français
- Public cible : habitants de Waterloo et environs
