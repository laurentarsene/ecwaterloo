/* ══════════════════════════════════════════════════════════════
   ECW — main.js
   Header (compact + scroll-spy + CTA contextuel), animations,
   inscription étudiante, lutins, lecteur de gazette.
   ══════════════════════════════════════════════════════════════ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.16,1,.3,1)';
// Un seul client Supabase pour toute la page (inscriptions étudiantes + lutins)
const sb = (typeof supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ══════════════════════════════════════════════════════════════
   ANCIENS LIENS — l'ancien one-page (ecwaterloo.com/#etudiants…)
   renvoie vers la page qui contient désormais la section
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (document.body.dataset.page !== 'accueil' || !location.hash) return;
  const id = location.hash.slice(1);
  const MOVED = {
    aide: '/aide/', 'aide-contenu': '/aide/#epicerie', epicerie: '/aide/#epicerie', services: '/aide/#services', workflow: '/aide/#workflow', rdv: '/aide/#rdv',
    etudiants: '/etudiants/', 'epicerie-etudiante': '/etudiants/', inscription: '/etudiants/#inscription',
    aider: '/aider/', benevoles: '/aider/#benevoles', don: '/aider/#don', soutenir: '/aider/#don', lutins: '/aider/#lutins',
    asbl: '/qui-sommes-nous/', histoire: '/qui-sommes-nous/#histoire', gazette: '/qui-sommes-nous/#gazette',
  };
  if (MOVED[id]) location.replace(MOVED[id]);
})();

/* ══════════════════════════════════════════════════════════════
   HEADER — compact au défilement, menu plein écran sur mobile
   ══════════════════════════════════════════════════════════════ */
(function () {
  const hdr = document.getElementById('hdr');
  if (!hdr) return;

  // Le header est fixe : une cale de sa hauteur (ouvert) évite que la page saute quand il se compacte
  const space = document.getElementById('hdrSpace');
  const fit = () => {
    if (hdr.classList.contains('is-compact')) return;
    const h = hdr.offsetHeight;
    if (space) space.style.height = h + 'px';
    document.documentElement.style.setProperty('--hdr-h', h + 'px');
  };
  fit();
  document.fonts?.ready.then(fit);
  window.addEventListener('resize', fit);

  let compact = false, raf = 0;
  const update = () => {
    raf = 0;
    const c = window.scrollY > 40;
    if (c !== compact) { compact = c; hdr.classList.toggle('is-compact', c); }
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  update();

  // Menu burger
  const menu = document.getElementById('menu');
  const openBtn = document.getElementById('menuOpen');
  const closeBtn = document.getElementById('menuClose');
  if (!menu || !openBtn) return;
  const site = document.querySelector('.site');
  const setMenu = (open) => {
    menu.hidden = !open;
    openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (site) site.inert = open;
    (open ? closeBtn : openBtn).focus();
  };
  openBtn.addEventListener('click', () => setMenu(true));
  closeBtn.addEventListener('click', () => setMenu(false));
  // Un lien vers une ancre de la page courante : on ferme le menu et on y va
  menu.querySelectorAll('a[href]').forEach(a => a.addEventListener('click', () => { if (!menu.hidden) setMenu(false); }));
  document.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key !== 'Tab') return;
    const items = [...menu.querySelectorAll('a[href], button')];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // Repassé en grand écran avec le menu ouvert : on le referme
  window.matchMedia('(min-width: 900px)').addEventListener?.('change', (e) => { if (e.matches && !menu.hidden) setMenu(false); });
})();

/* ══════════════════════════════════════════════════════════════
   RENDEZ-VOUS — sur mobile, le calendrier se déplie à la demande
   ══════════════════════════════════════════════════════════════ */
(function () {
  const box = document.getElementById('rdvCal');
  if (!box) return;
  const btn = document.getElementById('rdvOpen');

  // Intégration officielle Cal (instance européenne) : le cadre prend la hauteur de son contenu
  const LINK = 'epicerie-sociale-de-waterloo-e.c.w-vcjwji/rendez-vous';
  const CONFIG = { layout: 'month_view', theme: 'light' };
  let ready = false, inline = false;
  const initCal = () => {
    if (ready) return;
    ready = true;
    (function (C, A, L) { const p = (a, ar) => a.q.push(ar); const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.eu/embed/embed.js', 'init');
    Cal('init', 'rdv', { origin: 'https://app.cal.eu' });
    Cal.ns.rdv('ui', { theme: 'light', layout: 'month_view', hideEventTypeDetails: false, cssVarsPerTheme: { light: { 'cal-brand': '#1f3038' } } });
  };
  const showInline = () => {
    if (inline) return;
    inline = true;
    initCal();
    Cal.ns.rdv('inline', { elementOrSelector: '#rdvCal', calLink: LINK, config: CONFIG });
  };

  // Grands écrans : calendrier dans la page (en colonnes), chargé à l'approche de la section
  const mobile = window.matchMedia('(max-width: 899.98px)');
  const watch = () => {
    if (!('IntersectionObserver' in window)) { if (!mobile.matches) showInline(); return; }
    const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting) && !mobile.matches) { io.disconnect(); showInline(); } }, { rootMargin: '600px 0px' });
    io.observe(box);
  };
  watch();

  // Téléphone et tablette en portrait : le bouton ouvre le calendrier en plein écran
  btn?.addEventListener('click', () => {
    initCal();
    Cal.ns.rdv('modal', { calLink: LINK, config: CONFIG });
  });
})();

/* ══════════════════════════════════════════════════════════════
   SIX DOMAINES — accordéon sur mobile, colonnes ouvertes ailleurs
   ══════════════════════════════════════════════════════════════ */
(function () {
  const items = [...document.querySelectorAll('.domains > li')];
  if (!items.length) return;
  const mq = window.matchMedia('(max-width: 719.98px)');
  const apply = () => items.forEach((li) => {
    const h = li.querySelector('h3');
    if (mq.matches && !li.classList.contains('is-acc')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'domain__btn';
      b.textContent = h.textContent;
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', () => b.setAttribute('aria-expanded', String(li.classList.toggle('is-open'))));
      h.replaceChildren(b);
      li.classList.add('is-acc');
    } else if (!mq.matches && li.classList.contains('is-acc')) {
      h.textContent = h.textContent;
      li.classList.remove('is-acc', 'is-open');
    }
  });
  mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
  apply();
})();

/* ══════════════════════════════════════════════════════════════
   CARTES À FAIRE GLISSER (mobile) — points indicateurs
   ══════════════════════════════════════════════════════════════ */
(function () {
  const mq = window.matchMedia('(max-width: 719.98px)');
  document.querySelectorAll('.steps, .moments__grid, .years').forEach((rail) => {
    const items = [...rail.children];
    if (items.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'rail-dots';
    dots.setAttribute('aria-hidden', 'true');      // simple repère visuel : le contenu reste lisible au défilement
    items.forEach((item, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.addEventListener('click', () => rail.scrollTo({ left: item.offsetLeft - items[0].offsetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
      dots.appendChild(b);
    });
    rail.after(dots);
    // Zone qui défile : atteignable au clavier (flèches) quand elle est en carrousel
    const focusable = () => { if (mq.matches) rail.tabIndex = 0; else rail.removeAttribute('tabindex'); };
    mq.addEventListener ? mq.addEventListener('change', focusable) : mq.addListener(focusable);
    focusable();
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!mq.matches) return;
      const x = rail.scrollLeft;
      let best = 0, dist = Infinity;
      items.forEach((it, i) => { const d = Math.abs(it.offsetLeft - items[0].offsetLeft - x); if (d < dist) { dist = d; best = i; } });
      // tout au bout du défilement : le dernier point
      if (x + rail.clientWidth >= rail.scrollWidth - 4) best = items.length - 1;
      [...dots.children].forEach((d, i) => d.classList.toggle('is-active', i === best));
    };
    rail.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();

/* ══════════════════════════════════════════════════════════════
   ANIMATIONS — légères, lentes, une seule courbe
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (prefersReducedMotion || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const $ = (q, r = document) => [...r.querySelectorAll(q)];

  // Héro : titre puis colonne de droite, décalés de 80ms ; le hamac descend doucement
  const hero = document.getElementById('hero');
  if (hero) {
    const parts = [hero.querySelector('.hero__title'), ...$('.hero__side > *', hero)].filter(Boolean);
    parts.forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 1100, delay: 60 + i * 80, easing: EASE, fill: 'backwards' }));
    const ham = hero.querySelector('.hero__art');
    if (ham) {
      ham.style.transformOrigin = '50% 0';
      ham.animate([{ opacity: 0, transform: 'translateY(-12px) scale(.985)' }, { opacity: 1, transform: 'none' }],
        { duration: 1400, delay: 300, easing: EASE, fill: 'backwards' });
    }
  }

  // Révélation au scroll
  const targets = new Map();
  const add = (el, kind) => { if (el && !targets.has(el) && !(hero && hero.contains(el))) targets.set(el, kind); };
  $('.svc-art').forEach(el => targets.set(el, 'none'));             // pas d'animation sur les arches
  $('.paint img').forEach(el => add(el, 'up'));
  $('.paint__line').forEach(el => add(el, 'path'));
  $('.foot__art img').forEach(el => add(el, 'burst'));
  $([
    'section h1:not(.hero__title)', 'section h2:not(.sr-only)', 'section h3:not(.sr-only)', 'section img[src*="perso"]', '.domains > li', '#workflow li', '.amount',
    '.moment', '#etudiants li', '#lutins li', '.chips > .chip', '#inscription', '.tags > li',
  ].join(',')).forEach(el => add(el, 'up'));

  const rank = (el) => {
    const p = el.parentElement; if (!p) return 0;
    let i = 0;
    for (const c of p.children) { if (c === el) break; if (targets.has(c)) i++; }
    return Math.min(i, 6);
  };
  targets.forEach((k, el) => { if (k !== 'none') el.style.opacity = '0'; });

  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target, k = targets.get(el);
    io.unobserve(el);
    if (k === 'path') {
      el.style.transformOrigin = '0 50%';
      el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 2000, delay: 400, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'backwards' });
    } else if (k === 'burst') {
      el.animate([{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 1400, easing: EASE, fill: 'backwards' });
    } else {
      el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1100, delay: rank(el) * 60, easing: EASE, fill: 'backwards' });
    }
    el.style.opacity = '';
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  targets.forEach((k, el) => { if (k !== 'none') io.observe(el); });
})();

/* ══════════════════════════════════════════════════════════════
   Petit utilitaire de modale : ouverture, fermeture, focus rendu
   ══════════════════════════════════════════════════════════════ */
function makeModal(overlay, { onOpen } = {}) {
  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    overlay.inert = false;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    onOpen?.();
    setTimeout(() => overlay.querySelector('.sform__step.is-active input, .sform__step.is-active button, .sform__success:not([hidden]) button')?.focus(), 60);
  };
  const close = () => {
    overlay.inert = true;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    // Le focus reste dans la modale (Tab / Maj+Tab bouclent)
    if (e.key !== 'Tab') return;
    const items = [...overlay.querySelectorAll('button, input, a[href]')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  return { open, close };
}

/* ══════════════════════════════════════════════════════════════
   ÉPICERIE ÉTUDIANTE — date, ouverture des inscriptions, modale
   ══════════════════════════════════════════════════════════════ */
(function () {
  const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

  // Jour de l'épicerie pour le mois de `d` : exception éventuelle (config.js), sinon le 1er jeudi
  function epicerieDay(d, firstThuDay) {
    const exceptions = typeof EPICERIE_DATES_EXCEPTIONNELLES !== 'undefined' ? EPICERIE_DATES_EXCEPTIONNELLES : {};
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return exceptions[key] ?? firstThuDay;
  }
  function getNextFirstThursday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const daysToThu = (4 - d.getDay() + 7) % 7;
      const firstThu = new Date(d.getFullYear(), d.getMonth(), epicerieDay(d, 1 + daysToThu));
      if (firstThu > today) return firstThu;
    }
  }
  // Format enregistré en base (admin + rappels s'appuient dessus) : ne pas changer
  function formatDateFr(date) {
    return `Jeudi ${date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
  }
  const formatShort = (d) => `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;

  const nextThursday = getNextFirstThursday();
  const nextThursdayStr = formatDateFr(nextThursday);

  const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  setText('nextThursdayCard', formatShort(nextThursday));
  setText('nextThursdayDisplay', nextThursdayStr);
  document.querySelectorAll('.thursday-ref').forEach(el => el.textContent = nextThursdayStr);
  const hiddenDate = document.getElementById('hiddenDateRdv');
  if (hiddenDate) hiddenDate.value = nextThursdayStr;

  const overlay = document.getElementById('studentModal');
  const openBtn = document.getElementById('openStudentForm');
  const form = document.getElementById('studentForm');
  if (!overlay || !openBtn || !form) return;
  if (!sb) return;

  // Les inscriptions ouvrent X jours avant (réglage de l'admin) ; avant, compte à rebours
  (async function initButtonState() {
    let joursMax = 3;
    try {
      const { data } = await sb.from('settings').select('value').eq('key', 'jours_inscription_max').single();
      if (data) joursMax = parseInt(data.value, 10);
    } catch (_) {}

    const openDate = new Date(nextThursday);
    openDate.setDate(openDate.getDate() - joursMax); // ouverture à minuit
    if (Date.now() >= openDate.getTime()) return;

    const info = document.getElementById('studentOpen');
    openBtn.disabled = true;
    openBtn.textContent = 'Inscriptions pas encore ouvertes';
    if (!info) return;
    info.hidden = false;
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let ms = openDate.getTime() - Date.now();
      if (ms <= 0) { location.reload(); return; }
      const d = Math.floor(ms / 86400000); ms -= d * 86400000;
      const h = Math.floor(ms / 3600000); ms -= h * 3600000;
      const m = Math.floor(ms / 60000); ms -= m * 60000;
      const s = Math.floor(ms / 1000);
      info.innerHTML = `Les inscriptions ouvrent le <b>${formatShort(openDate)}</b> à minuit, dans ${d}&nbsp;j ${pad(h)}&nbsp;h ${pad(m)}&nbsp;min ${pad(s)}&nbsp;s.`;
      setTimeout(tick, 1000);
    };
    tick();
  })();

  const progressBar = document.getElementById('sformProgressBar');
  const successEl = document.getElementById('sformSuccess');
  const errorEl = document.getElementById('studentFormError');
  const modal = makeModal(overlay, { onOpen: () => { if (successEl.hidden) goToStep(1); } });

  openBtn.addEventListener('click', modal.open);
  document.getElementById('closeStudentModal')?.addEventListener('click', modal.close);
  document.getElementById('closeSuccess')?.addEventListener('click', modal.close);
  document.getElementById('studentModalBackdrop')?.addEventListener('click', modal.close);

  let currentStep = 1;
  const TOTAL = 3;
  function goToStep(n) {
    form.querySelectorAll('.sform__step').forEach(s => s.classList.remove('is-active'));
    const target = form.querySelector(`.sform__step[data-step="${n}"]`);
    if (target) { target.classList.add('is-active'); currentStep = n; }
    progressBar.style.width = (n === 1 ? 0 : Math.round(((n - 1) / TOTAL) * 100)) + '%';
    target?.querySelector('input, button')?.focus();
  }
  form.querySelectorAll('.sform__next').forEach(btn => btn.addEventListener('click', () => { if (validateStep(currentStep)) goToStep(currentStep + 1); }));
  form.querySelectorAll('.sform__prev').forEach(btn => btn.addEventListener('click', () => goToStep(currentStep - 1)));

  function validateStep(step) {
    let ok = true;
    form.querySelectorAll('.sform__input--error').forEach(el => el.classList.remove('sform__input--error'));
    document.getElementById('genreGroup')?.classList.remove('sform__radio-group--error');
    document.getElementById('engagementLabel')?.classList.remove('sform__checkbox--error');

    if (step === 2) {
      const prenom = document.getElementById('inputPrenom');
      const nom = document.getElementById('inputNom');
      const genre = form.querySelector('input[name="genre"]:checked');
      if (!prenom.value.trim()) { prenom.classList.add('sform__input--error'); ok = false; }
      if (!nom.value.trim()) { nom.classList.add('sform__input--error'); ok = false; }
      if (!genre) { document.getElementById('genreGroup').classList.add('sform__radio-group--error'); ok = false; }
      if (!ok) (form.querySelector('.sform__input--error') || prenom).focus();
    }
    if (step === 3) {
      const email = document.getElementById('inputEmail');
      const tel = document.getElementById('inputTel');
      if (!email.value.trim() || !/\S+@\S+\.\S+/.test(email.value)) { email.classList.add('sform__input--error'); ok = false; }
      if (!tel.value.trim()) { tel.classList.add('sform__input--error'); ok = false; }
      if (!ok) form.querySelector('.sform__input--error').focus();
    }
    if (step === 4) {
      const univ = document.getElementById('inputUniv');
      const check = document.getElementById('engagementCheck');
      if (!univ.value.trim()) { univ.classList.add('sform__input--error'); ok = false; }
      if (!check.checked) { document.getElementById('engagementLabel').classList.add('sform__checkbox--error'); ok = false; }
      if (!ok && !univ.value.trim()) univ.focus();
    }
    return ok;
  }

  let nbPersonnes = 1;
  const stepperVal = document.getElementById('stepperVal');
  const hiddenNb = document.getElementById('hiddenNbPersonnes');
  const minusBtn = document.getElementById('stepperMinus');
  const plusBtn = document.getElementById('stepperPlus');
  function updateStepper() {
    stepperVal.textContent = nbPersonnes;
    hiddenNb.value = nbPersonnes;
    minusBtn.disabled = nbPersonnes <= 1;
    plusBtn.disabled = nbPersonnes >= 10;
  }
  minusBtn.addEventListener('click', () => { if (nbPersonnes > 1) { nbPersonnes--; updateStepper(); } });
  plusBtn.addEventListener('click', () => { if (nbPersonnes < 10) { nbPersonnes++; updateStepper(); } });
  updateStepper();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    errorEl.hidden = true;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const origLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi…';

    const data = {
      prenom: document.getElementById('inputPrenom').value.trim(),
      nom: document.getElementById('inputNom').value.trim(),
      genre: form.querySelector('input[name="genre"]:checked')?.value,
      email: document.getElementById('inputEmail').value.trim(),
      telephone: document.getElementById('inputTel').value.trim(),
      universite: document.getElementById('inputUniv').value.trim(),
      nb_personnes: nbPersonnes,
      date_rdv: nextThursdayStr,
    };

    const { error: insertError } = await sb.from('inscriptions_etudiantes').insert([data]);
    if (insertError) {
      console.error(insertError);
      submitBtn.disabled = false;
      submitBtn.textContent = origLabel;
      errorEl.textContent = "L'inscription n'a pas pu être envoyée. Réessaie, ou écris-nous à infos.ecwaterloo@gmail.com.";
      errorEl.hidden = false;
      return;
    }

    sb.functions.invoke('send-email', { body: { type: 'confirmation', data } }).catch(err => console.warn('Email non envoyé :', err));

    form.hidden = true;
    progressBar.style.width = '100%';
    successEl.hidden = false;
    document.getElementById('successDate').textContent = nextThursdayStr;
    document.getElementById('closeSuccess')?.focus();
  });
})();

/* ══════════════════════════════════════════════════════════════
   PARTAGE (épicerie étudiante) — feuille de partage native du téléphone
   ══════════════════════════════════════════════════════════════ */
(function () {
  const btn = document.getElementById('shareEtu');
  if (!btn || !navigator.share) return;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    const date = document.getElementById('nextThursdayCard')?.textContent;
    try {
      await navigator.share({
        title: "L'épicerie étudiante de Waterloo",
        text: `Le premier jeudi du mois, l'épicerie de Waterloo est ouverte aux étudiant·es : tu repars avec tes courses pour 5€.${date ? ` La prochaine a lieu le ${date}.` : ''} Inscription en ligne :`,
        url: location.origin + '/etudiants/',
      });
    } catch (_) { /* partage annulé */ }
  });
})();

/* ══════════════════════════════════════════════════════════════
   LUTINS DE NOËL — inscription
   ══════════════════════════════════════════════════════════════ */
(function () {
  const overlay = document.getElementById('lutinModal');
  const openBtn = document.getElementById('openLutinForm');
  if (!overlay || !openBtn) return;
  if (!sb) return;

  const form = document.getElementById('lutinForm');
  const successEl = document.getElementById('lutinSuccess');
  const errorEl = document.getElementById('lutinFormError');
  const prenomInput = document.getElementById('lutinPrenom');
  const nomInput = document.getElementById('lutinNom');
  const telInput = document.getElementById('lutinTel');
  const emailInput = document.getElementById('lutinEmail');
  const hiddenNb = document.getElementById('hiddenNbLettres');
  const stepperVal = document.getElementById('lutinStepperVal');
  const minusBtn = document.getElementById('lutinStepperMinus');
  const plusBtn = document.getElementById('lutinStepperPlus');

  let nbLettres = 1;
  const MAX_LETTRES = 10;
  function updateStepper() {
    stepperVal.textContent = nbLettres;
    hiddenNb.value = nbLettres;
    minusBtn.disabled = nbLettres <= 1;
    plusBtn.disabled = nbLettres >= MAX_LETTRES;
  }
  minusBtn.addEventListener('click', () => { if (nbLettres > 1) { nbLettres--; updateStepper(); } });
  plusBtn.addEventListener('click', () => { if (nbLettres < MAX_LETTRES) { nbLettres++; updateStepper(); } });
  updateStepper();

  const modal = makeModal(overlay, { onOpen: () => { errorEl.hidden = true; } });
  openBtn.addEventListener('click', modal.open);
  document.getElementById('closeLutinModal')?.addEventListener('click', modal.close);
  document.getElementById('lutinModalBackdrop')?.addEventListener('click', modal.close);
  document.getElementById('closeLutinSuccess')?.addEventListener('click', modal.close);

  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
  function validate() {
    [prenomInput, nomInput, telInput, emailInput].forEach(el => el.classList.remove('sform__input--error'));
    errorEl.hidden = true;
    let ok = true;
    if (!prenomInput.value.trim()) { prenomInput.classList.add('sform__input--error'); ok = false; }
    if (!nomInput.value.trim()) { nomInput.classList.add('sform__input--error'); ok = false; }
    const tel = telInput.value.trim(), email = emailInput.value.trim();
    if (!tel && !email) {
      telInput.classList.add('sform__input--error');
      emailInput.classList.add('sform__input--error');
      showError("Merci d'indiquer au moins un téléphone ou un email.");
      ok = false;
    } else if (email && !/\S+@\S+\.\S+/.test(email)) {
      emailInput.classList.add('sform__input--error');
      showError("L'email ne semble pas valide.");
      ok = false;
    }
    if (!ok && errorEl.hidden) showError('Merci de remplir les champs requis.');
    return ok;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const origLabel = submitBtn.textContent;
    submitBtn.textContent = 'Envoi…';

    const data = {
      prenom: prenomInput.value.trim(),
      nom: nomInput.value.trim(),
      telephone: telInput.value.trim() || null,
      email: emailInput.value.trim() || null,
      nb_lettres: nbLettres,
    };
    const { error: insertError } = await sb.from('inscriptions_lutins').insert([data]);
    if (insertError) {
      console.error(insertError);
      submitBtn.disabled = false;
      submitBtn.textContent = origLabel;
      showError("L'inscription n'a pas pu être envoyée. Réessaie, ou écris-nous à infos.ecwaterloo@gmail.com.");
      return;
    }
    form.hidden = true;
    successEl.hidden = false;
    document.getElementById('closeLutinSuccess')?.focus();
  });
})();

/* ══════════════════════════════════════════════════════════════
   GAZETTES (mobile) — balayer la couverture du dessus la fait passer derrière
   ══════════════════════════════════════════════════════════════ */
(function () {
  const deck = document.querySelector('.gaz__covers');
  if (!deck) return;
  const mq = window.matchMedia('(max-width: 719.98px)');
  let drag = null, suppress = false;
  deck.addEventListener('pointerdown', (e) => {
    if (!mq.matches) return;
    const front = deck.querySelector('.gaz__cover:not(.gaz__cover--back)');
    if (front && front.contains(e.target)) drag = { x: e.clientX, y: e.clientY, dx: 0, moved: false, front };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; drag.front.style.transition = 'none'; }
    if (drag.moved) { drag.dx = dx; drag.front.style.transform = `translateX(${dx}px) rotate(${-3 + dx * 0.04}deg)`; }
  }, { passive: true });
  const end = () => {
    if (!drag) return;
    const { front, dx, moved } = drag;
    drag = null;
    front.style.transition = '';
    front.style.transform = '';
    if (!moved) return;
    suppress = true;
    setTimeout(() => { suppress = false; }, 400);
    if (Math.abs(dx) > 60) deck.querySelectorAll('.gaz__cover').forEach(c => c.classList.toggle('gaz__cover--back'));
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  // Après un balayage, pas d'ouverture du lecteur par erreur
  deck.addEventListener('click', (e) => { if (suppress) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
})();

/* ══════════════════════════════════════════════════════════════
   LECTEUR GAZETTE — livre plein écran (PDF.js + StPageFlip)
   Sans JS ou sans StPageFlip, les liens ouvrent simplement le PDF.
   ══════════════════════════════════════════════════════════════ */
(function () {
  const reader = document.getElementById('gazetteReader');
  const backdrop = document.getElementById('readerBackdrop');
  const closeBtn = document.getElementById('closeGazette');
  const prevBtn = document.getElementById('readerPrev');
  const nextBtn = document.getElementById('readerNext');
  const loading = document.getElementById('readerLoading');
  const bookEl = document.getElementById('readerBook');
  const stage = document.getElementById('readerStage');
  const curEl = document.getElementById('readerCurrentPage');
  const totEl = document.getElementById('readerTotalPages');
  const thumbsEl = document.getElementById('readerThumbs');
  const titleEl = document.getElementById('readerTitle');
  const dlEl = document.getElementById('readerDownload');
  if (!reader || !bookEl || typeof St === 'undefined') return;

  // pdf.js hébergé sur le site (aucun appel à un CDN tiers)
  const PDFJS = '/assets/vendor/pdf-3.11.174';

  let pdfDoc = null, totalPages = 0, loadedPdfUrl = null;
  let flip = null, pageRatio = 910 / 1286;
  let lastFocus = null, sessionToken = 0;

  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const ensurePdfJs = async () => {
    if (window.pdfjsLib) return;
    await loadScript(`${PDFJS}.min.js`);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}.worker.min.js`;
  };

  const renderPageImg = async (n, scaleH) => {
    const page = await pdfDoc.getPage(n);
    const vp1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: scaleH / vp1.height });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas;
  };

  const buildBook = async (token) => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const availH = stage.clientHeight - 24;
    const availW = stage.clientWidth - (isMobile ? 16 : 150);
    let pageH = availH;
    let pageW = pageH * pageRatio;
    const need = isMobile ? pageW : pageW * 2;
    if (need > availW) { const k = availW / need; pageW *= k; pageH *= k; }

    bookEl.innerHTML = '';
    const holders = [];
    for (let n = 1; n <= totalPages; n++) {
      const d = document.createElement('div');
      d.className = 'rpage rpage--loading';
      holders.push(d);
      bookEl.appendChild(d);
    }

    if (flip) { try { flip.destroy(); } catch (_) {} flip = null; }
    flip = new St.PageFlip(bookEl, {
      width: Math.round(pageW), height: Math.round(pageH),
      size: 'fixed', usePortrait: isMobile, showCover: true,
      maxShadowOpacity: 0.4, flippingTime: 700, mobileScrollSupport: false, swipeDistance: 16,
    });
    flip.loadFromHTML(holders);
    flip.on('flip', (e) => updateIndicator(e.data));
    updateIndicator(0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let n = 1; n <= totalPages; n++) {
      if (token !== sessionToken) return;
      const canvas = await renderPageImg(n, pageH * dpr);
      if (token !== sessionToken) return;
      const holder = holders[n - 1];
      holder.classList.remove('rpage--loading');
      holder.innerHTML = '';
      holder.appendChild(canvas);
      if (n === 2) loading.hidden = true;
    }
    loading.hidden = true;
  };

  const updateIndicator = (idx) => {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    curEl.textContent = (isMobile || idx === 0 || idx >= totalPages - 1) ? String(idx + 1) : `${idx + 1}–${Math.min(idx + 2, totalPages)}`;
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= totalPages - 1;
    updateThumbs(idx);
  };

  const buildThumbs = async (token) => {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reader__thumb';
      btn.dataset.page = p;
      btn.setAttribute('aria-label', `Aller à la page ${p}`);
      btn.appendChild(document.createElement('canvas'));
      const lbl = document.createElement('span'); lbl.textContent = p; btn.appendChild(lbl);
      btn.addEventListener('click', () => flip?.flip(p - 1));
      thumbsEl.appendChild(btn);
    }
    for (let p = 1; p <= totalPages; p++) {
      if (token !== sessionToken) return;
      try {
        const canvas = await renderPageImg(p, 144);
        const c = thumbsEl.querySelector(`[data-page="${p}"] canvas`);
        if (!c) return;
        c.width = canvas.width; c.height = canvas.height;
        c.style.height = '68px'; c.style.width = (canvas.width / 2) + 'px';
        c.getContext('2d').drawImage(canvas, 0, 0);
      } catch (_) {}
    }
  };
  const updateThumbs = (idx) => {
    if (!thumbsEl) return;
    thumbsEl.querySelectorAll('.reader__thumb').forEach(b => {
      const p = parseInt(b.dataset.page, 10) - 1;
      b.classList.toggle('is-active', p === idx || (idx > 0 && idx < totalPages - 1 && p === idx + 1));
    });
    thumbsEl.querySelector('.reader__thumb.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  const openReader = async (e) => {
    e.preventDefault();
    lastFocus = document.activeElement;
    const url = e.currentTarget.dataset.pdf;
    if (titleEl) titleEl.textContent = e.currentTarget.dataset.title || '';
    if (dlEl) dlEl.href = url;
    reader.inert = false;
    reader.classList.add('is-open');
    reader.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loading.hidden = false;
    closeBtn.focus();
    const token = ++sessionToken;
    try {
      await ensurePdfJs();
      if (loadedPdfUrl !== url) {
        pdfDoc = await window.pdfjsLib.getDocument(url).promise;
        totalPages = pdfDoc.numPages;
        totEl.textContent = totalPages;
        loadedPdfUrl = url;
        const vp = (await pdfDoc.getPage(1)).getViewport({ scale: 1 });
        pageRatio = vp.width / vp.height;
      }
      if (token !== sessionToken) return;
      await Promise.all([buildBook(token), buildThumbs(token)]);
    } catch (err) {
      console.error('Gazette reader error:', err);
      loading.hidden = true;
    }
  };

  const closeReader = () => {
    sessionToken++;
    reader.inert = true;
    reader.classList.remove('is-open');
    reader.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };

  document.querySelectorAll('[data-open-gazette]').forEach(b => b.addEventListener('click', openReader));
  closeBtn.addEventListener('click', closeReader);
  backdrop.addEventListener('click', closeReader);
  prevBtn.addEventListener('click', () => flip?.flipPrev());
  nextBtn.addEventListener('click', () => flip?.flipNext());

  document.addEventListener('keydown', (e) => {
    if (!reader.classList.contains('is-open')) return;
    if (e.key === 'Tab') {
      const items = [...reader.querySelectorAll('button, a[href]')].filter(el => !el.disabled && el.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (e.key === 'Escape') closeReader();
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); flip?.flipNext(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); flip?.flipPrev(); }
    else if (e.key === 'Home') { e.preventDefault(); flip?.flip(0); }
    else if (e.key === 'End') { e.preventDefault(); flip?.flip(totalPages - 1); }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!reader.classList.contains('is-open')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { const t = ++sessionToken; loading.hidden = false; buildBook(t); }, 200);
  });
})();
