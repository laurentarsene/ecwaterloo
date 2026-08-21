/* ══════════════════════════════════════════════════════════════
   ECW — main.js
   ══════════════════════════════════════════════════════════════ */

document.body.classList.remove('no-js');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════════════════════════════════════════════════════════
   NAV — mobile + lien actif
   ══════════════════════════════════════════════════════════════ */
(function () {
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileNavClose');

  const openMobile = () => {
    if (!mobileNav) return;
    mobileNav.classList.add('is-open');
    mobileNav.setAttribute('aria-hidden', 'false');
    toggle?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    mobileClose?.focus();
  };
  const closeMobile = () => {
    if (!mobileNav) return;
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    toggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    toggle?.focus();
  };
  toggle?.addEventListener('click', openMobile);
  mobileClose?.addEventListener('click', closeMobile);
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));
  mobileNav?.addEventListener('click', (e) => { if (e.target === mobileNav) closeMobile(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileNav?.classList.contains('is-open')) closeMobile(); });

  // Lien actif selon le chapitre visible (nav desktop + barre de chapitres mobile)
  const links = [...document.querySelectorAll('[data-nav-link]')];
  const targets = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  let lastActiveId = null;
  const update = () => {
    const y = window.scrollY + window.innerHeight * 0.35;
    let active = null;
    targets.forEach(t => { if (t.getBoundingClientRect().top + window.scrollY <= y) active = t; });
    links.forEach(l => l.classList.toggle('is-active', active && l.getAttribute('href') === '#' + active.id));
    // La puce du chapitre courant se recentre dans la barre mobile
    const id = active ? active.id : null;
    if (id !== lastActiveId) {
      lastActiveId = id;
      document.querySelector('.nav__chapters a.is-active')
        ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  };
  window.addEventListener('scroll', update, { passive: true });
  update();

  // État "scrollé" : la nav se densifie et prend une ombre
  const nav = document.getElementById('nav');
  const updateNav = () => nav?.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Mobile : le calendrier de rendez-vous se déplie à la demande
  const rdvToggle = document.getElementById('rdvToggle');
  const rdvWrap = document.getElementById('rdvWrap');
  rdvToggle?.addEventListener('click', () => {
    rdvWrap?.classList.remove('is-collapsed');
    rdvToggle.hidden = true;
  });

  // Le calendrier apparaît en fondu une fois chargé
  const rdvFrame = document.querySelector('.rdv__frame');
  rdvFrame?.addEventListener('load', () => rdvFrame.classList.add('is-loaded'));

  // Sélecteur de langue : dropdown + liens vers le site entier traduit (translate.goog)
  const dd = document.getElementById('langDd');
  const ddBtn = document.getElementById('langDdBtn');
  const ddMenu = document.getElementById('langDdMenu');
  if (dd && ddBtn && ddMenu) {
    const host = location.hostname;
    if (host && host !== 'localhost' && !host.startsWith('127.') && !host.startsWith('192.168.')) {
      const gt = host.replace(/-/g, '--').replace(/\./g, '-') + '.translate.goog';
      ddMenu.querySelectorAll('[data-lang]').forEach(a => {
        const tl = a.dataset.lang;
        a.href = 'https://' + gt + '/?_x_tr_sl=fr&_x_tr_tl=' + tl + '&_x_tr_hl=' + tl;
      });
    }
    const close = () => { dd.classList.remove('is-open'); ddMenu.hidden = true; ddBtn.setAttribute('aria-expanded', 'false'); };
    ddBtn.addEventListener('click', () => {
      const open = ddMenu.hidden;
      ddMenu.hidden = !open;
      dd.classList.toggle('is-open', open);
      ddBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
})();

/* ══════════════════════════════════════════════════════════════
   APPARITION + COMPTEURS
   ══════════════════════════════════════════════════════════════ */
(function () {
  const counters = [...document.querySelectorAll('[data-count]')];
  const finalize = (el) => { el.innerHTML = el.dataset.count + (el.dataset.suffix || ''); };

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    counters.forEach(finalize);
    return;
  }

  // Sections : léger fondu à l'entrée
  const targets = document.querySelectorAll('.chapter, .section-head, .door, .service, .step, .don, .temps-item, .figure, .etu__card, .gaz__cover');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      // Une fois entré, on retire .reveal pour rendre leurs transitions hover aux cartes
      e.target.addEventListener('transitionend', () => e.target.classList.remove('reveal', 'is-in'), { once: true });
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  targets.forEach(el => io.observe(el));

  // Compteurs
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, target = parseInt(el.dataset.count, 10), suffix = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1200;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        el.innerHTML = v + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  counters.forEach(el => cio.observe(el));
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

    const lblEl = document.getElementById('studentCountLbl');
    const dateEl = document.getElementById('studentCountDate');
    const timerEl = document.getElementById('studentTimer');
    const openDate = new Date(nextThursday); openDate.setDate(openDate.getDate() - joursMax); // ouverture à minuit
    const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const fmtLong = (d) => `${jours[d.getDay()]} ${formatDateFr(d).replace(/^Jeudi /, '')}`;

    const runTimer = (target, onDone) => {
      if (!timerEl) return;
      const cells = {};
      timerEl.querySelectorAll('[data-unit]').forEach(b => { cells[b.dataset.unit] = b; });
      const pad = (n) => String(n).padStart(2, '0');
      const tick = () => {
        let ms = target - Date.now();
        if (ms <= 0) { onDone?.(); return; }
        const d = Math.floor(ms / 86400000); ms -= d * 86400000;
        const h = Math.floor(ms / 3600000); ms -= h * 3600000;
        const m = Math.floor(ms / 60000); ms -= m * 60000;
        const sec = Math.floor(ms / 1000);
        cells.d.textContent = pad(d); cells.h.textContent = pad(h); cells.m.textContent = pad(m); cells.s.textContent = pad(sec);
        setTimeout(tick, 1000);
      };
      tick();
    };

    if (daysUntilOpen > 0) {
      btn.disabled = true;
      btn.classList.add('btn--disabled');
      btn.textContent = 'Inscriptions pas encore ouvertes';
      if (countdown) {
        lblEl.textContent = 'Ouverture des inscriptions dans';
        dateEl.textContent = `Le ${fmtLong(openDate)} à minuit`;
        countdown.hidden = false;
        runTimer(openDate.getTime(), () => location.reload());
      }
    } else if (countdown) {
      lblEl.textContent = 'Inscriptions ouvertes — prochain jeudi dans';
      dateEl.textContent = '';
      countdown.classList.add('is-open');
      countdown.hidden = false;
      runTimer(nextThursday.getTime());
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
   GAZETTE READER — livre plein écran (PDF.js + StPageFlip)
   ══════════════════════════════════════════════════════════════ */
(function () {
  const openBtn = document.getElementById('openGazette');
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

  const PDFJS_VER = '3.11.174';
  const CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}`;

  let pdfDoc = null, totalPages = 0, loadedPdfUrl = null;
  let flip = null, pageRatio = 910 / 1286;
  let lastFocus = null, sessionToken = 0;

  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const ensurePdfJs = async () => {
    if (window.pdfjsLib) return;
    await loadScript(`${CDN}/build/pdf.min.js`);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${CDN}/build/pdf.worker.min.js`;
  };

  const renderPageImg = async (n, scaleH) => {
    const page = await pdfDoc.getPage(n);
    const vp1 = page.getViewport({ scale: 1 });
    const scale = scaleH / vp1.height;
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return canvas;
  };

  const buildBook = async (token) => {
    // taille disponible
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
      size: 'fixed',
      usePortrait: isMobile,
      showCover: true,
      maxShadowOpacity: 0.4,
      flippingTime: 700,
      mobileScrollSupport: false,
      swipeDistance: 16,
    });
    flip.loadFromHTML(holders);
    flip.on('flip', (e) => updateIndicator(e.data));
    updateIndicator(0);

    // rendu progressif : pages visibles d'abord, puis le reste
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const order = [];
    for (let n = 1; n <= totalPages; n++) order.push(n);
    for (const n of order) {
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
    // idx = index de page StPageFlip (0-based, page de gauche du spread)
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    let label;
    if (isMobile || idx === 0 || idx >= totalPages - 1) label = String(idx + 1);
    else label = `${idx + 1}–${Math.min(idx + 2, totalPages)}`;
    curEl.textContent = label;
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= totalPages - 1;
    updateThumbs(idx);
  };

  /* Miniatures */
  const buildThumbs = async (token) => {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reader__thumb';
      btn.dataset.page = p;
      btn.setAttribute('aria-label', `Aller à la page ${p}`);
      const c = document.createElement('canvas');
      btn.appendChild(c);
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
      const on = p === idx || (idx > 0 && idx < totalPages - 1 && p === idx + 1);
      b.classList.toggle('is-active', on);
    });
    thumbsEl.querySelector('.reader__thumb.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  const openReader = async (e) => {
    lastFocus = document.activeElement;
    const src = e?.currentTarget?.dataset?.pdf ? e.currentTarget : openBtn;
    const url = src.dataset.pdf;
    if (titleEl) titleEl.textContent = src.dataset.title || '';
    if (dlEl) dlEl.href = url;
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
        const p1 = await pdfDoc.getPage(1);
        const vp = p1.getViewport({ scale: 1 });
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
    reader.classList.remove('is-open');
    reader.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };

  openBtn?.addEventListener('click', openReader);
  document.getElementById('openGazetteCover')?.addEventListener('click', openReader);
  document.querySelectorAll('[data-open-gazette]').forEach(b => b.addEventListener('click', openReader));
  closeBtn.addEventListener('click', closeReader);
  backdrop.addEventListener('click', closeReader);
  prevBtn.addEventListener('click', () => flip?.flipPrev());
  nextBtn.addEventListener('click', () => flip?.flipNext());

  document.addEventListener('keydown', (e) => {
    if (!reader.classList.contains('is-open')) return;
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

/* ══════════════════════════════════════════════════════════════
   CARTE — l'épicerie (Leaflet + tuiles CARTO)
   ══════════════════════════════════════════════════════════════ */
(function () {
  const el = document.getElementById('map');
  if (!el || typeof L === 'undefined') return;
  const pos = [50.71443, 4.38369]; // Rue de la Station 139A, 1410 Waterloo
  const map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(pos, 16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', pane: 'shadowPane' }).addTo(map);
  const icon = L.divIcon({ className: 'map-pin', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -14] });
  L.marker(pos, { icon, title: "Espace Convivial de Waterloo" }).addTo(map)
    .bindPopup('<b>Espace Convivial de Waterloo</b><br>Rue de la Station 139A<br>1410 Waterloo<br><a href="https://www.google.com/maps/dir/?api=1&destination=Rue+de+la+Station+139A,+1410+Waterloo" target="_blank" rel="noopener">Itinéraire →</a>');
  // Léger décalage pour laisser respirer le marqueur
  map.panBy([0, -20], { animate: false });
})();

