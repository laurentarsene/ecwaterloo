#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   ECW — génération des pages
   Les pages s'écrivent dans src/ (gabarit commun + contenus) ;
   `node build.mjs` produit les fichiers HTML servis tels quels.
   Après une modification CSS/JS, augmenter la version ci-dessous.
   ══════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));

const V = { css: 4, js: 29, chat: 5 };

const SUPABASE = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>\n';
const PAGEFLIP = '<script src="https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js" defer></script>\n';
const HERO_PRELOAD = '  <link rel="preload" as="image" href="/assets/images/perso/c1.webp" imagesrcset="/assets/images/perso/c1-900.webp 900w, /assets/images/perso/c1.webp 1656w" imagesizes="(max-width: 1440px) 100vw, 1392px">\n';

const PAGES = [
  {
    page: 'accueil', out: 'index.html', path: '/',
    title: 'Espace Convivial de Waterloo · Épicerie sociale et accompagnement',
    ogTitle: 'Espace Convivial de Waterloo',
    description: "Épicerie sociale et équipe de bénévoles à Waterloo : courses, logement, emploi, santé, papiers et budget. Accompagnement gratuit, confidentiel et sans jugement. ASBL 100% bénévole depuis 2014.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'], headExtra: HERO_PRELOAD,
  },
  {
    page: 'aide', chapter: 'aide', out: 'aide/index.html', path: '/aide/',
    title: "Besoin d'aide ? · Espace Convivial de Waterloo",
    ogTitle: "Besoin d'aide ? L'Espace Convivial de Waterloo",
    description: "Épicerie sociale et accompagnement gratuit à Waterloo : alimentation, emploi, logement, papiers, santé et budget. Comment ça se passe, et comment prendre rendez-vous.",
    cta: ['#rdv', 'Prendre rendez-vous'],
  },
  {
    page: 'etudiants', chapter: 'etudiants', out: 'etudiants/index.html', path: '/etudiants/',
    title: 'Épicerie étudiante · Espace Convivial de Waterloo',
    ogTitle: "L'épicerie étudiante de Waterloo",
    description: "Le premier jeudi du mois, l'épicerie est réservée aux étudiant·es : tu repars avec tes courses pour 5€. Inscription en ligne obligatoire.",
    cta: ['#inscription', "Je m'inscris"], modals: ['modal-etudiant'], scripts: SUPABASE,
  },
  {
    page: 'aider', chapter: 'aider', out: 'aider/index.html', path: '/aider/',
    title: "Envie d'aider ? · Espace Convivial de Waterloo",
    ogTitle: "Envie d'aider l'Espace Convivial de Waterloo ?",
    description: "Donner un peu de temps, faire un don ou devenir lutin·e de Noël : toutes les façons d'aider l'épicerie sociale de Waterloo.",
    cta: ['#don', 'Faire un don'], modals: ['modal-lutins'], scripts: SUPABASE,
  },
  {
    page: 'qui-sommes-nous', chapter: 'asbl', out: 'qui-sommes-nous/index.html', path: '/qui-sommes-nous/',
    title: 'Qui sommes-nous ? · Espace Convivial de Waterloo',
    ogTitle: "Qui sommes-nous ? L'Espace Convivial de Waterloo",
    description: "Douze ans d'entraide à Waterloo : comment l'épicerie sociale est née en 2014, pourquoi elle est devenue une porte d'entrée vers un accompagnement plus large, nos dates clés et la Gazette conviviale.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'], modals: ['lecteur-gazette'], scripts: PAGEFLIP,
  },
];

// Ancre → page qui la contient (les liens #ancre deviennent /page/#ancre ailleurs)
const OWNER = {
  aide: 'aide', 'aide-contenu': 'aide', epicerie: 'aide', services: 'aide', workflow: 'aide', rdv: 'aide',
  etudiants: 'etudiants', inscription: 'etudiants',
  aider: 'aider', benevoles: 'aider', don: 'aider', lutins: 'aider',
  asbl: 'qui-sommes-nous', histoire: 'qui-sommes-nous', dates: 'qui-sommes-nous', gazette: 'qui-sommes-nous',
  hero: 'accueil', 'temps-forts': 'accueil',
};
const ROOT = { aide: '/aide/', etudiants: '/etudiants/', aider: '/aider/', asbl: '/qui-sommes-nous/' };
const PAGE_URL = { accueil: '/', aide: '/aide/', etudiants: '/etudiants/', aider: '/aider/', 'qui-sommes-nous': '/qui-sommes-nous/' };

const read = (f) => readFileSync(join(DIR, f), 'utf8');

const layout = read('src/layout.html');
const footer = read('src/partials/footer.html');

function links(html, page) {
  return html
    .replace(/href="#([\w-]+)"/g, (m, id) => {
      const owner = OWNER[id];
      if (!owner || owner === page) return m;
      return `href="${ROOT[id] || PAGE_URL[owner] + '#' + id}"`;
    })
    .replace(/(["\s,])assets\//g, '$1/assets/')
    .replace(/href="(bienvenue|admin)\.html"/g, 'href="/$1.html"')
    .replace(/href="notre-histoire\.html"/g, 'href="/qui-sommes-nous/#histoire"');
}

for (const p of PAGES) {
  let content = read(`src/pages/${p.page}.html`);
  // Le grand titre de chapitre devient le titre de la page
  if (p.chapter) content = content.replace(/<h2 class="h-chap">([\s\S]*?)<\/h2>/, '<h1 class="h-chap">$1</h1>');
  const modals = (p.modals || []).map(m => read(`src/partials/${m}.html`)).join('\n');

  let html = layout
    .replaceAll('{{title}}', p.title)
    .replaceAll('{{og_title}}', p.ogTitle)
    .replaceAll('{{description}}', p.description)
    .replaceAll('{{path}}', p.path)
    .replaceAll('{{page}}', p.page)
    .replace('{{head_extra}}', p.headExtra || '')
    .replace('{{chapter_attr}}', p.chapter ? ` data-chapter="${p.chapter}"` : '')
    .replace('{{home_current}}', p.page === 'accueil' ? ' aria-current="page"' : '')
    .replace('{{cta_href}}', p.cta[0])
    .replace('{{cta_label}}', p.cta[1])
    .replace('{{content}}', content.trimEnd())
    .replace('{{footer}}', footer.trimEnd())
    .replace('{{modals}}', modals)
    .replace('{{scripts}}', p.scripts || '')
    .replace('{{v_css}}', V.css).replace('{{v_js}}', V.js).replace('{{v_chat}}', V.chat);

  if (p.chapter) html = html.replaceAll(`data-nav="${p.chapter}">`, `data-nav="${p.chapter}" aria-current="page">`);
  html = links(html, p.page);
  html = html.replace('<html lang="fr">', '<html lang="fr">\n<!-- Généré par build.mjs depuis src/ : modifier src/, puis lancer `node build.mjs` -->');

  mkdirSync(join(DIR, dirname(p.out)), { recursive: true });
  writeFileSync(join(DIR, p.out), html);
  console.log('✓', p.out);
}
