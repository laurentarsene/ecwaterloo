/* ══════════════════════════════════════════════════════════════
   ECW — main.js
   Interactions + animations (GSAP optionnel)
   ══════════════════════════════════════════════════════════════ */

document.body.classList.remove('no-js');

const hasGSAP = typeof gsap !== 'undefined';
if (hasGSAP && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════════════════════════════════════════════════════════
   INTRO HERO — révélation en cascade (CSS-driven)
   ══════════════════════════════════════════════════════════════ */
(function () {
  const intro = [...document.querySelectorAll('[data-intro]')];
  const cards = [...document.querySelectorAll('.fan__card')];
  const tags = [...document.querySelectorAll('.fan__tag')];

  intro.forEach((el, i) => {
    el.style.transition = 'opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)';
    el.style.transitionDelay = `${0.05 + i * 0.12}s`;
  });
  cards.forEach((el, i) => {
    el.style.transition = 'opacity .8s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1)';
    el.style.transitionDelay = `${0.35 + i * 0.07}s`;
  });
  tags.forEach((el) => { el.style.opacity = '0'; el.style.transition = 'opacity .6s ease'; });

  const start = () => {
    document.body.classList.add('is-ready');
    setTimeout(() => tags.forEach(el => { el.style.opacity = '1'; }), 900);
    // Nettoie les delays pour que le hover des cartes reste réactif
    setTimeout(() => {
      intro.forEach(el => { el.style.transition = ''; el.style.transitionDelay = ''; });
      cards.forEach(el => { el.style.transition = ''; el.style.transitionDelay = ''; });
    }, 1800);
  };

  if (document.readyState === 'complete') requestAnimationFrame(start);
  else window.addEventListener('load', () => requestAnimationFrame(start), { once: true });
  // Failsafe : jamais plus de 2.5s masqué
  setTimeout(() => { if (!document.body.classList.contains('is-ready')) start(); }, 2500);
})();

/* ══════════════════════════════════════════════════════════════
   NAV — scroll + mobile + active
   ══════════════════════════════════════════════════════════════ */
(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileNavClose');

  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const openMobile = () => {
    if (!mobileNav) return;
    mobileNav.classList.add('is-open');
    mobileNav.setAttribute('aria-hidden', 'false');
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeMobile = () => {
    if (!mobileNav) return;
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  toggle?.addEventListener('click', openMobile);
  mobileClose?.addEventListener('click', closeMobile);
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));
  mobileNav?.addEventListener('click', (e) => { if (e.target === mobileNav) closeMobile(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileNav?.classList.contains('is-open')) closeMobile(); });

  // Lien actif
  const links = document.querySelectorAll('[data-nav-link]');
  const sections = [...links].map(l => l.getAttribute('href')).filter(h => h?.startsWith('#')).map(id => document.querySelector(id)).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = '#' + e.target.id;
          links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === id));
        }
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    sections.forEach(s => io.observe(s));
  }
})();

/* ══════════════════════════════════════════════════════════════
   SPLIT — mots
   ══════════════════════════════════════════════════════════════ */
function splitIntoWords(el) {
  if (el.dataset.split === 'done') return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);
  textNodes.forEach(tn => {
    const parts = tn.nodeValue.split(/([ \t\r\n]+)/);
    const frag = document.createDocumentFragment();
    parts.forEach(p => {
      if (/^[ \t\r\n]+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
      if (!p.length) return;
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = p;
      frag.appendChild(span);
    });
    tn.parentNode.replaceChild(frag, tn);
  });
  el.dataset.split = 'done';
}

/* ══════════════════════════════════════════════════════════════
   SCROLL ANIMATIONS (GSAP)
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!hasGSAP || prefersReducedMotion || typeof ScrollTrigger === 'undefined') {
    // Sans animation : afficher directement les valeurs finales
    document.querySelectorAll('[data-count]').forEach(el => { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
    return;
  }

  const rise = (targets, opts = {}) => {
    const els = typeof targets === 'string' ? document.querySelectorAll(targets) : targets;
    if (!els || !els.length) return;
    gsap.from(els, {
      y: 28, opacity: 0, duration: .8, ease: 'power3.out',
      stagger: opts.stagger ?? .08,
      scrollTrigger: { trigger: opts.trigger || els[0], start: opts.start || 'top 85%' }
    });
  };

  // Titres : mot par mot
  document.querySelectorAll('[data-split-lines]').forEach(el => {
    splitIntoWords(el);
    const words = el.querySelectorAll('.word');
    gsap.fromTo(words, { y: 24, opacity: 0 }, {
      y: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .035,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  // Paragraphes : allumage progressif
  document.querySelectorAll('[data-reveal-words]').forEach(el => {
    splitIntoWords(el);
    const words = el.querySelectorAll('.word');
    words.forEach(w => w.classList.add('word--dim'));
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 55%', scrub: .6,
      onUpdate: (self) => {
        const cutoff = Math.ceil(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('is-lit', i < cutoff));
      }
    });
  });

  document.querySelectorAll('.section-kicker, .section-sub').forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });

  // Compteurs
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(obj, { v: target, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = Math.floor(obj.v) + suffix; } })
    });
  });

  rise('.impact__item', { trigger: '.impact', stagger: .06 });
  rise('.manifesto__signature', { stagger: 0 });
  document.querySelectorAll('.services__grid, .wf, .temps__grid, .soutenir__grid, .contact__grid').forEach(grid => {
    rise(grid.children, { trigger: grid, start: 'top 80%', stagger: .08 });
  });
  rise('.timeline li', { trigger: '.timeline', stagger: .05 });
  rise('.etu__steps li', { trigger: '.etu__steps', stagger: .06 });
  rise('.benev__steps li', { trigger: '.benev__steps', stagger: .06 });
  rise('.gaz__issue', { trigger: '.gaz__issues', stagger: .1 });
  rise('.soutenir__free', { stagger: 0, start: 'top 90%' });

  // Visuels : blobs, cover, carte étudiante, photo bénévoles
  gsap.from('.blob', { scale: .85, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: .15, scrollTrigger: { trigger: '.histoire__visual', start: 'top 80%' } });
  gsap.from('.gaz__cover', { y: 40, opacity: 0, rotation: -8, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.gaz__grid', start: 'top 78%' } });
  gsap.from('.etu__card', { y: 40, opacity: 0, rotation: 4, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.etu__card', start: 'top 82%' } });
  gsap.from('.etu__card-stat', { scale: .9, opacity: 0, duration: .5, ease: 'back.out(1.6)', stagger: .06, scrollTrigger: { trigger: '.etu__card-stats', start: 'top 88%' } });
  gsap.from('.benev__visual', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.benev__grid', start: 'top 78%' } });
  gsap.from('.benev__badge', { scale: .8, opacity: 0, duration: .6, ease: 'back.out(1.8)', stagger: .15, delay: .3, scrollTrigger: { trigger: '.benev__visual', start: 'top 75%' } });
  gsap.from('.contact__icon', { scale: .6, opacity: 0, duration: .7, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.contact__cta', start: 'top 85%' } });

  // Parallaxe douce sur les photos des temps forts
  document.querySelectorAll('.temps-item__img').forEach(img => {
    gsap.to(img, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // Étapes workflow : active au centre
  document.querySelectorAll('.wf__step').forEach(step => {
    ScrollTrigger.create({ trigger: step, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: step, className: 'is-active' } });
  });
})();

/* ══════════════════════════════════════════════════════════════
   MODAL ÉTUDIANTS — Supabase
   ══════════════════════════════════════════════════════════════ */
(function () {
  function getNextFirstThursday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const dow = d.getDay();
      const daysToThu = (4 - dow + 7) % 7;
      const firstThu = new Date(d.getFullYear(), d.getMonth(), 1 + daysToThu);
      if (firstThu > today) return firstThu;
    }
  }
  function formatDateFr(date) {
    const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return `Jeudi ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
  }

  const nextThursday = getNextFirstThursday();
  const nextThursdayStr = formatDateFr(nextThursday);

  const modalDateEl = document.getElementById('nextThursdayDisplay');
  if (modalDateEl) modalDateEl.textContent = nextThursdayStr;
  const cardDateEl = document.getElementById('nextThursdayCard');
  if (cardDateEl) cardDateEl.textContent = nextThursdayStr;
  document.querySelectorAll('.thursday-ref').forEach(el => el.textContent = nextThursdayStr);
  const hiddenDate = document.getElementById('hiddenDateRdv');
  if (hiddenDate) hiddenDate.value = nextThursdayStr;

  if (typeof supabase === 'undefined' || typeof SUPABASE_URL === 'undefined') return;

  const { createClient } = supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function initButtonState() {
    let joursMax = 3;
    try {
      const { data } = await sb.from('settings').select('value').eq('key', 'jours_inscription_max').single();
      if (data) joursMax = parseInt(data.value, 10);
    } catch (_) {}

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((nextThursday - today) / 86400000);
    const daysUntilOpen = daysUntil - joursMax;

    const btn = document.getElementById('openStudentForm');
    const countdown = document.getElementById('studentCountdown');
    if (!btn) return;

    if (daysUntilOpen > 0) {
      btn.disabled = true;
      btn.classList.add('btn--disabled');
      if (countdown) {
        const j = daysUntilOpen;
        countdown.textContent = `Inscriptions ouvertes dans ${j} jour${j > 1 ? 's' : ''} · ${nextThursdayStr}`;
        countdown.hidden = false;
      }
    }
  }
  initButtonState();

  const overlay = document.getElementById('studentModal');
  const backdrop = document.getElementById('studentModalBackdrop');
  const openBtn = document.getElementById('openStudentForm');
  const closeBtn = document.getElementById('closeStudentModal');
  const form = document.getElementById('studentForm');
  const progressBar = document.getElementById('sformProgressBar');
  const successEl = document.getElementById('sformSuccess');

  if (!overlay || !openBtn || !form) return;

  function openModal() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    goToStep(1);
  }
  function closeModal() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  document.getElementById('closeSuccess')?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal(); });

  let currentStep = 1;
  const TOTAL = 3;

  function goToStep(n) {
    document.querySelectorAll('.sform__step').forEach(s => s.classList.remove('is-active'));
    const target = document.querySelector(`.sform__step[data-step="${n}"]`);
    if (target) {
      target.classList.add('is-active');
      currentStep = n;
    }
    const pct = n === 1 ? 0 : Math.round(((n - 1) / TOTAL) * 100);
    progressBar.style.width = pct + '%';
  }

  document.querySelectorAll('.sform__next').forEach(btn => {
    btn.addEventListener('click', () => { if (validateStep(currentStep)) goToStep(currentStep + 1); });
  });
  document.querySelectorAll('.sform__prev').forEach(btn => {
    btn.addEventListener('click', () => goToStep(currentStep - 1));
  });

  function validateStep(step) {
    let ok = true;
    document.querySelectorAll('.sform__input--error').forEach(el => el.classList.remove('sform__input--error'));
    document.getElementById('genreGroup')?.classList.remove('sform__radio-group--error');
    document.getElementById('engagementLabel')?.classList.remove('sform__checkbox--error');

    if (step === 2) {
      const prenom = document.getElementById('inputPrenom');
      const nom = document.getElementById('inputNom');
      const genre = document.querySelector('input[name="genre"]:checked');
      if (!prenom.value.trim()) { prenom.classList.add('sform__input--error'); ok = false; }
      if (!nom.value.trim()) { nom.classList.add('sform__input--error'); ok = false; }
      if (!genre) { document.getElementById('genreGroup').classList.add('sform__radio-group--error'); ok = false; }
      if (!ok) (document.querySelector('.sform__input--error') || prenom).focus();
    }
    if (step === 3) {
      const email = document.getElementById('inputEmail');
      const tel = document.getElementById('inputTel');
      if (!email.value.trim() || !/\S+@\S+\.\S+/.test(email.value)) { email.classList.add('sform__input--error'); ok = false; }
      if (!tel.value.trim()) { tel.classList.add('sform__input--error'); ok = false; }
      if (!ok) document.querySelector('.sform__input--error').focus();
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

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    const origLabel = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn__label">Envoi…</span>';

    const data = {
      prenom: document.getElementById('inputPrenom').value.trim(),
      nom: document.getElementById('inputNom').value.trim(),
      genre: document.querySelector('input[name="genre"]:checked')?.value,
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
      submitBtn.innerHTML = origLabel;
      return;
    }

    sb.functions.invoke('send-email', { body: { type: 'confirmation', data } }).catch(err => console.warn('Email non envoyé :', err));

    form.hidden = true;
    progressBar.style.width = '100%';
    successEl.hidden = false;
    document.getElementById('successDate').textContent = nextThursdayStr;
  });
})();

/* ══════════════════════════════════════════════════════════════
   FORMULAIRE LUTINS (Opération Lutins & Lutines — Noël)
   ══════════════════════════════════════════════════════════════ */
(function () {
  const overlay = document.getElementById('lutinModal');
  const openBtn = document.getElementById('openLutinForm');
  if (!overlay || !openBtn) return;
  if (typeof supabase === 'undefined' || typeof SUPABASE_URL === 'undefined') return;

  const { createClient } = supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const backdrop = document.getElementById('lutinModalBackdrop');
  const closeBtn = document.getElementById('closeLutinModal');
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

  function openModal() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    form.hidden = false;
    successEl.hidden = true;
    errorEl.hidden = true;
  }
  function closeModal() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  document.getElementById('closeLutinSuccess')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal(); });

  function clearErrors() {
    [prenomInput, nomInput, telInput, emailInput].forEach(el => el.classList.remove('sform__input--error'));
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function validate() {
    clearErrors();
    let ok = true;

    if (!prenomInput.value.trim()) { prenomInput.classList.add('sform__input--error'); ok = false; }
    if (!nomInput.value.trim()) { nomInput.classList.add('sform__input--error'); ok = false; }

    const tel = telInput.value.trim();
    const email = emailInput.value.trim();

    if (!tel && !email) {
      telInput.classList.add('sform__input--error');
      emailInput.classList.add('sform__input--error');
      showError('Merci d\'indiquer au moins un téléphone ou un email.');
      ok = false;
    } else if (email && !/\S+@\S+\.\S+/.test(email)) {
      emailInput.classList.add('sform__input--error');
      showError('L\'email ne semble pas valide.');
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
    const origLabel = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn__label">Envoi…</span>';

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
      submitBtn.innerHTML = origLabel;
      showError('Oups — une erreur est survenue. Réessaie ou écris-nous à infos.ecwaterloo@gmail.com');
      return;
    }

    form.hidden = true;
    successEl.hidden = false;
  });
})();

/* ══════════════════════════════════════════════════════════════
   NAV DROPDOWNS
   ══════════════════════════════════════════════════════════════ */
(function () {
  const items = document.querySelectorAll('.nav__item--drop');
  if (!items.length) return;

  let closeTimer;

  const closeAll = () => items.forEach(i => {
    i.classList.remove('is-open');
    i.querySelector('.nav__link--drop')?.setAttribute('aria-expanded', 'false');
  });

  items.forEach(item => {
    const btn = item.querySelector('.nav__link--drop');
    const drop = item.querySelector('.nav__drop');
    if (!btn || !drop) return;

    const open = () => {
      clearTimeout(closeTimer);
      items.forEach(i => { if (i !== item) { i.classList.remove('is-open'); i.querySelector('.nav__link--drop')?.setAttribute('aria-expanded', 'false'); } });
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    };
    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        item.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }, 180);
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.classList.contains('is-open')) {
        item.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        open();
      }
    });
    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', scheduleClose);

    // Ferme après clic sur un item
    drop.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }));
  });

  // Fermer en cliquant en dehors
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item--drop')) closeAll();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
})();
/* ══════════════════════════════════════════════════════════════
   BACK TO TOP
   ══════════════════════════════════════════════════════════════ */
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ══════════════════════════════════════════════════════════════
   CHATBOT — arbre conversationnel
   ══════════════════════════════════════════════════════════════ */
(function () {
  const TREE = {
    start: {
      bot: "Bonjour 👋 Comment puis-je vous orienter ?",
      choices: [
        { label: "J'ai besoin d'aide", next: 'need_help' },
        { label: "Je suis étudiant·e", next: 'student' },
        { label: "Devenir bénévole", next: 'volunteer' },
        { label: "Soutenir l'ECW", next: 'donate' }
      ]
    },
    need_help: {
      bot: "Quel type d'aide vous faut-il ?",
      choices: [
        { label: "Alimentation", next: 'help_food' },
        { label: "Logement / Admin", next: 'help_admin' },
        { label: "Emploi", next: 'help_job' },
        { label: "Autre besoin", next: 'help_other' }
      ]
    },
    help_food: { bot: "Nos distributions se font sur rendez-vous chaque semaine. N'hésitez pas à nous contacter.", action: { label: "Prendre rendez-vous →", href: "#rdv" }, choices: [] },
    help_admin: { bot: "Logement, justice, démarches admin… Nos bénévoles vous accompagnent à chaque étape.", action: { label: "Prendre rendez-vous →", href: "#rdv" }, choices: [] },
    help_job: { bot: "Aide au CV, préparation aux entretiens, mise en relation avec des employeurs.", action: { label: "Prendre rendez-vous →", href: "#rdv" }, choices: [] },
    help_other: { bot: "Appelez-nous ou passez nous voir. Nous trouverons ensemble la meilleure solution.", action: { label: "Nous appeler", href: "tel:+32465927366" }, choices: [] },
    student: {
      bot: "Chaque premier jeudi du mois, nos portes s'ouvrent aux étudiant·e·s pour 5€ symboliques.",
      choices: [
        { label: "M'inscrire", next: 'student_signup' },
        { label: "En savoir plus", next: 'student_info' }
      ]
    },
    student_signup: { bot: "L'inscription prend 30 secondes. Rendez-vous sur la section étudiants !", action: { label: "S'inscrire →", href: "#etudiants" }, choices: [] },
    student_info: { bot: "Tous les détails sont sur la page dédiée : horaires, adresse, règles.", action: { label: "Voir la section →", href: "#etudiants" }, choices: [] },
    volunteer: {
      bot: "Génial ! Aucune compétence particulière requise — juste de la bonne volonté.",
      choices: [
        { label: "Comment ça fonctionne ?", next: 'volunteer_how' },
        { label: "Je suis partant·e !", next: 'volunteer_join' }
      ]
    },
    volunteer_how: { bot: "Chaque bénévole est formé et accompagné. Une réunion d'intégration est organisée régulièrement.", action: { label: "En savoir plus →", href: "#benevoles" }, choices: [] },
    volunteer_join: { bot: "Super ! Rendez-vous sur notre page bénévoles pour rejoindre l'équipe.", action: { label: "Rejoindre l'équipe →", href: "#benevoles" }, choices: [] },
    donate: {
      bot: "Merci pour votre générosité 🙏 Comment souhaitez-vous nous aider ?",
      choices: [
        { label: "Don financier", next: 'donate_money' },
        { label: "Don en nature", next: 'donate_goods' },
        { label: "Parler de nous", next: 'donate_share' }
      ]
    },
    donate_money: { bot: "Chaque don, même modeste, fait une vraie différence. Découvrez les différents montants sur la page soutien.", action: { label: "Faire un don →", href: "#soutenir" }, choices: [] },
    donate_goods: { bot: "Vêtements, nourriture, matériel scolaire… Contactez-nous pour organiser un dépôt.", action: { label: "Nous contacter →", href: "#contact" }, choices: [] },
    donate_share: { bot: "Parlez de nous autour de vous ! La visibilité nous aide énormément.", action: { label: "Découvrir l'ECW →", href: "#histoire" }, choices: [] }
  };

  const trigger = document.getElementById('chatTrigger');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const choicesEl = document.getElementById('chatChoices');
  const backBtn = document.getElementById('chatBack');
  if (!trigger || !panel) return;

  let isOpen = false, history = [], initialized = false;

  function openChat() {
    isOpen = true;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.querySelector('.chat__trigger-icon--open').style.display = 'none';
    trigger.querySelector('.chat__trigger-icon--close').style.display = '';
    trigger.querySelector('.chat__trigger-label').textContent = 'Fermer';
    if (!initialized) { initialized = true; showNode('start', null); }
  }
  function closeChat() {
    isOpen = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.querySelector('.chat__trigger-icon--open').style.display = '';
    trigger.querySelector('.chat__trigger-icon--close').style.display = 'none';
    trigger.querySelector('.chat__trigger-label').textContent = 'Aide';
  }

  trigger.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  function showNode(nodeId, userLabel) {
    history.push({ nodeId, userLabel });
    if (userLabel) addMsg('user', userLabel);
    const typing = addTyping();
    setTimeout(() => {
      typing.remove();
      const node = TREE[nodeId];
      addMsg('bot', node.bot);
      if (node.action) addAction(node.action);
      renderChoices(node.choices);
      renderBack();
      scrollBottom();
    }, 650);
  }
  function goBack() {
    if (history.length <= 1) return;
    history.pop();
    rebuild();
  }
  function rebuild() {
    const saved = [...history];
    history = [];
    messagesEl.innerHTML = '';
    saved.forEach(({ nodeId, userLabel }, i) => {
      const node = TREE[nodeId];
      if (userLabel) {
        const el = document.createElement('div');
        el.className = 'chat-msg chat-msg--user';
        el.style.animation = 'none';
        el.textContent = userLabel;
        messagesEl.appendChild(el);
      }
      const el = document.createElement('div');
      el.className = 'chat-msg chat-msg--bot';
      el.style.animation = 'none';
      el.textContent = node.bot;
      messagesEl.appendChild(el);
      if (node.action && i === saved.length - 1) addAction(node.action);
      history.push({ nodeId, userLabel });
    });
    const lastNode = TREE[saved[saved.length - 1].nodeId];
    renderChoices(lastNode.choices);
    renderBack();
    scrollBottom();
  }
  function addMsg(role, text) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-msg--${role}`;
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollBottom();
    return el;
  }
  function addAction(action) {
    const el = document.createElement('div');
    el.className = 'chat-msg chat-msg--action';
    const a = document.createElement('a');
    a.href = action.href;
    a.textContent = action.label;
    if (action.href.startsWith('#')) a.addEventListener('click', closeChat);
    el.appendChild(a);
    messagesEl.appendChild(el);
  }
  function addTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    scrollBottom();
    return el;
  }
  function renderChoices(choices) {
    choicesEl.innerHTML = '';
    choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'chat-choice';
      btn.textContent = c.label;
      btn.style.animationDelay = `${i * 55}ms`;
      btn.addEventListener('click', () => {
        choicesEl.querySelectorAll('.chat-choice').forEach(b => { b.disabled = true; });
        showNode(c.next, c.label);
      });
      choicesEl.appendChild(btn);
    });
  }
  function renderBack() { backBtn.hidden = history.length <= 1; }
  backBtn.addEventListener('click', goBack);
  function scrollBottom() { setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50); }
})();

/* ══════════════════════════════════════════════════════════════
   GAZETTE READER — PDF.js flipbook
   ══════════════════════════════════════════════════════════════ */
(function () {
  const openBtn = document.getElementById('openGazette');
  const reader = document.getElementById('gazetteReader');
  const backdrop = document.getElementById('readerBackdrop');
  const closeBtn = document.getElementById('closeGazette');
  const prevBtn = document.getElementById('readerPrev');
  const nextBtn = document.getElementById('readerNext');
  const loading = document.getElementById('readerLoading');
  const spread = document.getElementById('readerSpread');
  const canvasL = document.getElementById('readerCanvasLeft');
  const canvasR = document.getElementById('readerCanvasRight');
  const curEl = document.getElementById('readerCurrentPage');
  const totEl = document.getElementById('readerTotalPages');
  if (!openBtn || !reader) return;

  const PDFJS_VER = '3.11.174';
  const CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}`;

  let pdfDoc = null;
  let totalPages = 0;
  let currentLeft = 1; // page index of the left page in the current spread
  let renderToken = 0;
  let loadedPdfUrl = null;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  const ensurePdfJs = async () => {
    if (window.pdfjsLib) return;
    await loadScript(`${CDN}/build/pdf.min.js`);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN}/build/pdf.worker.min.js`;
  };

  const isMobile = () => window.matchMedia('(max-width: 700px)').matches;

  const getDisplayScale = (page) => {
    const vp = page.getViewport({ scale: 1 });
    const stage = document.getElementById('readerStage');
    const navGutter = isMobile() ? 0 : 140;
    const stageW = stage.clientWidth - navGutter;
    const stageH = stage.clientHeight - 16;
    const maxW = isMobile() ? stageW : (stageW - 2) / 2;
    const scaleW = maxW / vp.width;
    const scaleH = stageH / vp.height;
    return Math.min(scaleW, scaleH);
  };

  const renderToCanvas = async (pageNum, canvas) => {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) {
      canvas.hidden = true;
      return;
    }
    const page = await pdfDoc.getPage(pageNum);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayScale = getDisplayScale(page);
    const renderScale = displayScale * dpr;
    const renderVp = page.getViewport({ scale: renderScale });
    const displayVp = page.getViewport({ scale: displayScale });
    const ctx = canvas.getContext('2d');
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    canvas.style.width = displayVp.width + 'px';
    canvas.style.height = displayVp.height + 'px';
    await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
    canvas.hidden = false;
  };

  const showSpread = async () => {
    if (!pdfDoc) return;
    const token = ++renderToken;
    spread.classList.add('is-changing');
    loading.hidden = false;

    // Determine which pages to show
    // Page 1 alone (cover), then 2-3, 4-5, 6-7, 8 alone (back cover)
    let leftPage, rightPage;
    if (currentLeft === 1) {
      leftPage = null; rightPage = 1;
    } else if (currentLeft > totalPages) {
      leftPage = totalPages; rightPage = null;
    } else {
      leftPage = currentLeft;
      rightPage = currentLeft + 1 <= totalPages ? currentLeft + 1 : null;
    }

    // Détermine mono vs double spread
    const single = isMobile() || !leftPage || !rightPage;
    spread.classList.toggle('reader__spread--single', single);

    if (isMobile()) {
      // Toujours une seule page visible sur mobile
      const page = rightPage || leftPage;
      canvasL.hidden = true;
      if (page) await renderToCanvas(page, canvasR);
      else canvasR.hidden = true;
    } else {
      if (leftPage) await renderToCanvas(leftPage, canvasL);
      else canvasL.hidden = true;
      if (rightPage) await renderToCanvas(rightPage, canvasR);
      else canvasR.hidden = true;
    }

    if (token !== renderToken) return;

    // Update indicator
    const visible = [leftPage, rightPage].filter(Boolean);
    if (visible.length === 1) curEl.textContent = visible[0];
    else curEl.textContent = `${visible[0]}–${visible[1]}`;

    // Disable / enable nav buttons
    prevBtn.disabled = currentLeft <= 1;
    nextBtn.disabled = currentLeft >= totalPages;

    loading.hidden = true;
    spread.classList.remove('is-changing');
  };

  const next = () => {
    if (currentLeft >= totalPages) return;
    if (currentLeft === 1) currentLeft = 2;           // cover -> pages 2-3
    else currentLeft = Math.min(currentLeft + 2, totalPages);
    showSpread();
  };

  const prev = () => {
    if (currentLeft <= 1) return;
    if (currentLeft === 2) currentLeft = 1;           // pages 2-3 -> cover
    else currentLeft = Math.max(currentLeft - 2, 1);
    showSpread();
  };

  const openReader = async () => {
    const url = openBtn.dataset.pdf;
    reader.classList.add('is-open');
    reader.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loading.hidden = false;

    try {
      await ensurePdfJs();
      if (loadedPdfUrl !== url) {
        pdfDoc = await window.pdfjsLib.getDocument(url).promise;
        totalPages = pdfDoc.numPages;
        totEl.textContent = totalPages;
        loadedPdfUrl = url;
        currentLeft = 1;
      }
      await showSpread();
    } catch (err) {
      console.error('Gazette reader error:', err);
      loading.hidden = true;
    }
  };

  const closeReader = () => {
    reader.classList.remove('is-open');
    reader.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', openReader);
  closeBtn.addEventListener('click', closeReader);
  backdrop.addEventListener('click', closeReader);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  document.addEventListener('keydown', (e) => {
    if (!reader.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeReader();
    else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  // Re-render on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!reader.classList.contains('is-open')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(showSpread, 150);
  });

  // Click left / right half of the spread to navigate
  spread.addEventListener('click', (e) => {
    const r = spread.getBoundingClientRect();
    const isLeftHalf = (e.clientX - r.left) < r.width / 2;
    if (isLeftHalf) prev(); else next();
  });
})();
