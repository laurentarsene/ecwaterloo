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

const V = { css: 18, js: 36, chat: 5 };

// Informations légales (footer, page Confidentialité) : à un seul endroit
const LEGAL = {
  legal_name: 'Espace Convivial de Waterloo',
  legal_address: 'Rue de la Station 139A, 1410 Waterloo',
  legal_bce: 'BE 1014.707.991',
  legal_rpm: 'RPM Brabant wallon',
  retention_etudiants: '12 mois après la date de passage',
  retention_lutins: "jusqu'au 31 janvier qui suit l'opération",
  retention_benevoles: '12 mois après la date du créneau',
  legal_updated: '7 octobre 2026',
};

const PAGEFLIP = '<script src="/assets/vendor/page-flip-2.0.7.js" defer></script>\n';
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
    cta: ['#inscription', "Je m'inscris"], modals: ['modal-etudiant'],
  },
  {
    page: 'aider', chapter: 'aider', out: 'aider/index.html', path: '/aider/',
    title: "Envie d'aider ? · Espace Convivial de Waterloo",
    ogTitle: "Envie d'aider l'Espace Convivial de Waterloo ?",
    description: "Donner un peu de temps, faire un don ou devenir lutin·e de Noël : toutes les façons d'aider l'épicerie sociale de Waterloo.",
    cta: ['#don', 'Faire un don'], modals: ['modal-lutins'],
  },
  {
    page: 'qui-sommes-nous', chapter: 'asbl', out: 'qui-sommes-nous/index.html', path: '/qui-sommes-nous/',
    title: 'Qui sommes-nous ? · Espace Convivial de Waterloo',
    ogTitle: "Qui sommes-nous ? L'Espace Convivial de Waterloo",
    description: "Douze ans d'entraide à Waterloo : comment l'épicerie sociale est née en 2014, pourquoi elle est devenue une porte d'entrée vers un accompagnement plus large, nos dates clés et la Gazette conviviale.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'], modals: ['lecteur-gazette'], scripts: PAGEFLIP,
  },
  {
    page: 'benevoles', chapter: 'aider', out: 'benevoles/index.html', path: '/benevoles/',
    title: 'Calendrier des bénévoles · Espace Convivial de Waterloo',
    ogTitle: 'Devenir bénévole à l\'épicerie sociale de Waterloo',
    description: "Choisissez un créneau et inscrivez-vous en une minute, sans compte : distribution des colis, épicerie, potager, transport, événements. L'équipe valide votre venue et vous envoie un rappel.",
    cta: ['#calendrier', 'Choisir un créneau'], modals: ['modal-benevole'],
  },
  {
    page: 'impact', chapter: 'asbl', out: 'impact/index.html', path: '/impact/',
    title: 'Notre impact · Espace Convivial de Waterloo',
    ogTitle: 'Notre impact · Espace Convivial de Waterloo',
    description: "L'Espace Convivial de Waterloo en quelques chiffres, des témoignages de bénévoles et d'habitués tirés de la Gazette conviviale, et nos partenaires.",
    cta: ['/aider/#don', 'Faire un don'],
  },
  {
    page: 'agenda', out: 'agenda/index.html', path: '/agenda/', h1: true, doors: 'all',
    title: 'Agenda & nouvelles · Espace Convivial de Waterloo',
    ogTitle: 'Agenda de l\'Espace Convivial de Waterloo',
    description: "Les prochains rendez-vous de l'épicerie sociale de Waterloo : fêtes, collectes, spectacles, distributions, et les dernières nouvelles.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'],
  },
  {
    page: 'facile-a-lire', out: 'facile-a-lire/index.html', path: '/facile-a-lire/', h1: true, doors: 'all',
    title: 'Facile à lire · Espace Convivial de Waterloo',
    ogTitle: 'Espace Convivial de Waterloo, facile à lire',
    description: "L'Espace Convivial de Waterloo expliqué avec des mots simples : qui nous sommes, comment nous pouvons vous aider et comment nous contacter.",
    cta: ['tel:+32465927366', 'Appeler'],
  },
  {
    page: 'suivi', out: 'suivi/index.html', path: '/suivi/', robots: 'noindex, nofollow',
    title: 'Votre inscription · Espace Convivial de Waterloo',
    ogTitle: 'Espace Convivial de Waterloo',
    description: "Confirmer, annuler ou suivre votre inscription à l'Espace Convivial de Waterloo.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'],
  },
  {
    page: 'en', layout: 'langue', lang: 'en', dir: 'ltr', out: 'en/index.html', path: '/en/',
    title: 'Help in Waterloo · Espace Convivial de Waterloo',
    ogTitle: 'Do you need help? · Espace Convivial de Waterloo',
    description: 'A social grocery and volunteers in Waterloo who help with food, housing, work, health, paperwork and budget. Free, confidential and without judgement.',
    t: { t_skip: 'Skip to content', t_langues: 'Languages', t_appeler: 'Call us', t_asbl: 'volunteer-run non-profit since 2014', t_autres: 'Other languages', t_vie_privee: 'Privacy (in French)' },
  },
  {
    page: 'uk', layout: 'langue', lang: 'uk', dir: 'ltr', out: 'uk/index.html', path: '/uk/',
    title: 'Допомога у Ватерлоо · Espace Convivial de Waterloo',
    ogTitle: 'Потрібна допомога? · Espace Convivial de Waterloo',
    description: 'Соціальний продуктовий магазин і волонтери у Ватерлоо допомагають з харчуванням, житлом, роботою, здоров\'ям, документами та бюджетом. Безкоштовно, конфіденційно й без осуду.',
    t: { t_skip: 'Перейти до змісту', t_langues: 'Мови', t_appeler: 'Зателефонувати', t_asbl: 'волонтерська неприбуткова асоціація з 2014 року', t_autres: 'Інші мови', t_vie_privee: 'Конфіденційність (французькою)' },
  },
  {
    page: 'ar', layout: 'langue', lang: 'ar', dir: 'rtl', out: 'ar/index.html', path: '/ar/',
    title: 'مساعدة في واترلو · Espace Convivial de Waterloo',
    ogTitle: 'هل تحتاجون إلى مساعدة؟ · Espace Convivial de Waterloo',
    description: 'بقالة اجتماعية ومتطوعون في واترلو يساعدونكم في الطعام والسكن والعمل والصحة والأوراق والميزانية. مجانًا وبسرية ومن دون أحكام.',
    t: { t_skip: 'الانتقال إلى المحتوى', t_langues: 'اللغات', t_appeler: 'اتصلوا بنا', t_asbl: 'جمعية تطوعية غير ربحية منذ 2014', t_autres: 'لغات أخرى', t_vie_privee: 'الخصوصية (بالفرنسية)' },
  },
  {
    page: 'bienvenue', out: 'bienvenue.html', path: '/bienvenue', doors: 'all',
    title: 'Bienvenue · Welcome · Espace Convivial de Waterloo',
    ogTitle: 'Bienvenue · Welcome · Espace Convivial de Waterloo',
    description: "Espace Convivial de Waterloo : welcome, welkom, willkommen, ласкаво просимо, добро пожаловать, أهلاً وسهلاً. L'essentiel dans votre langue.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'],
  },
  {
    page: 'confidentialite', out: 'confidentialite/index.html', path: '/confidentialite/', h1: true,
    title: 'Confidentialité et mentions légales · Espace Convivial de Waterloo',
    ogTitle: 'Confidentialité · Espace Convivial de Waterloo',
    description: "Comment l'Espace Convivial de Waterloo utilise et protège vos données, vos droits, et les mentions légales de l'ASBL.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'],
  },
  {
    page: '404', out: '404.html', path: '/404', robots: 'noindex, follow', doors: 'all',
    title: 'Page introuvable · Espace Convivial de Waterloo',
    ogTitle: 'Espace Convivial de Waterloo',
    description: "Cette page n'existe pas ou plus. Retrouvez l'épicerie sociale, l'épicerie étudiante, les façons d'aider et notre histoire.",
    cta: ['/aide/#rdv', 'Prendre rendez-vous'],
  },
];

// Ancre → page qui la contient (les liens #ancre deviennent /page/#ancre ailleurs)
const OWNER = {
  aide: 'aide', 'aide-contenu': 'aide', epicerie: 'aide', services: 'aide', workflow: 'aide', rdv: 'aide',
  etudiants: 'etudiants', inscription: 'etudiants',
  aider: 'aider', benevoles: 'aider', don: 'aider', lutins: 'aider',
  asbl: 'qui-sommes-nous', histoire: 'qui-sommes-nous', dates: 'qui-sommes-nous', gazette: 'qui-sommes-nous', abonnement: 'qui-sommes-nous',
  besoins: 'aider', calendrier: 'benevoles', comment: 'benevoles',
  chiffres: 'impact', temoignages: 'impact', partenaires: 'impact',
  hero: 'accueil', 'temps-forts': 'accueil', 'a-venir': 'accueil',
};
const ROOT = { aide: '/aide/', etudiants: '/etudiants/', aider: '/aider/', asbl: '/qui-sommes-nous/' };
const PAGE_URL = { accueil: '/', aide: '/aide/', etudiants: '/etudiants/', aider: '/aider/', 'qui-sommes-nous': '/qui-sommes-nous/', benevoles: '/benevoles/', impact: '/impact/' };

const read = (f) => readFileSync(join(DIR, f), 'utf8');

const layout = read('src/layout.html');
const layoutLangue = read('src/layout-langue.html');
const footer = read('src/partials/footer.html');
const portes = read('src/partials/portes.html');

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
  // Pages traduites : gabarit simple, entièrement dans la langue de la page
  if (p.layout === 'langue') {
    content = content.replace(/<h2 class="h-chap">([\s\S]*?)<\/h2>/, '<h1 class="h-chap">$1</h1>');
    let html = layoutLangue.replaceAll('{{lang}}', p.lang).replace('{{dir}}', p.dir)
      .replaceAll('{{title}}', p.title).replaceAll('{{og_title}}', p.ogTitle).replaceAll('{{description}}', p.description)
      .replaceAll('{{path}}', p.path).replaceAll('{{page}}', p.page).replace('{{content}}', content.trimEnd()).replace('{{v_css}}', V.css);
    for (const [k, v] of Object.entries(p.t)) html = html.replaceAll(`{{${k}}}`, v);
    html = links(html, p.page).replace(`hreflang="${p.lang}">`, `hreflang="${p.lang}" aria-current="page">`);
    mkdirSync(join(DIR, dirname(p.out)), { recursive: true });
    writeFileSync(join(DIR, p.out), html.replace(`<html lang="${p.lang}"`, `<!-- Généré par build.mjs depuis src/ -->\n<html lang="${p.lang}"`));
    console.log('✓', p.out);
    continue;
  }
  // Le grand titre de chapitre devient le titre de la page
  if (p.chapter || p.h1) content = content.replace(/<h2 class="h-chap">([\s\S]*?)<\/h2>/, '<h1 class="h-chap">$1</h1>');
  // Fin de page : les portes vers les autres chapitres (tous les chemins mènent partout)
  if ((p.chapter || p.doors === 'all') && p.page !== 'suivi') {
    const doors = portes.split('\n').filter(l => !p.chapter || !l.includes(`data-door="${p.chapter}"`)).join('\n');
    content = content.trimEnd() + '\n\n' + doors;
  }
  const modals = (p.modals || []).map(m => read(`src/partials/${m}.html`)).join('\n');

  let html = layout
    .replaceAll('{{title}}', p.title)
    .replaceAll('{{og_title}}', p.ogTitle)
    .replaceAll('{{description}}', p.description)
    .replaceAll('{{path}}', p.path)
    .replace('{{robots}}', p.robots || 'index, follow')
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

  for (const [k, v] of Object.entries(LEGAL)) html = html.replaceAll(`{{${k}}}`, v);
  if (p.chapter) html = html.replaceAll(`data-nav="${p.chapter}"`, `data-nav="${p.chapter}" aria-current="page"`);
  html = links(html, p.page);
  html = html.replace('<html lang="fr">', '<html lang="fr">\n<!-- Généré par build.mjs depuis src/ : modifier src/, puis lancer `node build.mjs` -->');

  mkdirSync(join(DIR, dirname(p.out)), { recursive: true });
  writeFileSync(join(DIR, p.out), html);
  console.log('✓', p.out);
}
