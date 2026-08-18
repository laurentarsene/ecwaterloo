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

  // Lien actif selon le chapitre visible
  const links = [...document.querySelectorAll('[data-nav-link]')];
  const targets = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  const update = () => {
    const y = window.scrollY + window.innerHeight * 0.35;
    let active = null;
    targets.forEach(t => { if (t.getBoundingClientRect().top + window.scrollY <= y) active = t; });
    links.forEach(l => l.classList.toggle('is-active', active && l.getAttribute('href') === '#' + active.id));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
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
  const targets = document.querySelectorAll('.door, .service, .step, .don, .temps-item, .figure, .etu__card, .gaz__cover');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
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
  const thumbsEl = document.getElementById('readerThumbs');
  if (!openBtn || !reader) return;

  const PDFJS_VER = '3.11.174';
  const CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}`;

  let pdfDoc = null;
  let totalPages = 0;
  let currentLeft = 1;      // page de gauche de la double page courante
  let renderToken = 0;
  let loadedPdfUrl = null;
  let activeTasks = [];     // rendus PDF.js en cours (annulables)
  let lastFocus = null;

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
    const navGutter = isMobile() ? 0 : 150;
    const stageW = stage.clientWidth - navGutter;
    const stageH = stage.clientHeight - 24;
    const maxW = isMobile() ? stageW : (stageW - 2) / 2;
    return Math.min(maxW / vp.width, stageH / vp.height);
  };

  const cancelActive = async () => {
    const tasks = activeTasks;
    activeTasks = [];
    tasks.forEach(t => { try { t.cancel(); } catch (_) {} });
    // Attendre que PDF.js libère les canvas avant de relancer un rendu
    await Promise.allSettled(tasks.map(t => t.promise));
  };

  const renderToCanvas = async (pageNum, canvas, token) => {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) { canvas.hidden = true; return; }
    const page = await pdfDoc.getPage(pageNum);
    if (token !== renderToken) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayScale = getDisplayScale(page);
    const renderVp = page.getViewport({ scale: displayScale * dpr });
    const displayVp = page.getViewport({ scale: displayScale });
    const ctx = canvas.getContext('2d');
    canvas.width = renderVp.width;
    canvas.height = renderVp.height;
    canvas.style.width = displayVp.width + 'px';
    canvas.style.height = displayVp.height + 'px';
    const task = page.render({ canvasContext: ctx, viewport: renderVp });
    activeTasks.push(task);
    try { await task.promise; }
    catch (err) { if (err?.name === 'RenderingCancelledException') return; throw err; }
    if (token !== renderToken) return;
    canvas.hidden = false;
  };

  const pagesFor = (left) => {
    if (left === 1) return [null, 1];
    if (left > totalPages) return [totalPages, null];
    return [left, left + 1 <= totalPages ? left + 1 : null];
  };

  const showSpread = async () => {
    if (!pdfDoc) return;
    const token = ++renderToken;
    await cancelActive();
    if (token !== renderToken) return;
    spread.classList.add('is-changing');
    const slowTimer = setTimeout(() => { if (token === renderToken) loading.hidden = false; }, 260);

    const [leftPage, rightPage] = pagesFor(currentLeft);
    const single = isMobile() || !leftPage || !rightPage;
    spread.classList.toggle('reader__spread--single', single);

    try {
      if (isMobile()) {
        const page = rightPage || leftPage;
        canvasL.hidden = true;
        if (page) await renderToCanvas(page, canvasR, token); else canvasR.hidden = true;
      } else {
        await Promise.all([
          leftPage ? renderToCanvas(leftPage, canvasL, token) : (canvasL.hidden = true, Promise.resolve()),
          rightPage ? renderToCanvas(rightPage, canvasR, token) : (canvasR.hidden = true, Promise.resolve()),
        ]);
      }
    } catch (err) {
      console.error('Gazette reader error:', err);
    }
    clearTimeout(slowTimer);
    if (token !== renderToken) return;

    const visible = [leftPage, rightPage].filter(Boolean);
    curEl.textContent = visible.length === 1 ? visible[0] : `${visible[0]}–${visible[1]}`;
    prevBtn.disabled = currentLeft <= 1;
    nextBtn.disabled = currentLeft >= totalPages;
    updateThumbs(visible);
    loading.hidden = true;
    spread.classList.remove('is-changing');
  };

  const goTo = (left) => { currentLeft = left; showSpread(); };
  const next = () => {
    if (currentLeft >= totalPages) return;
    goTo(currentLeft === 1 ? 2 : Math.min(currentLeft + 2, totalPages));
  };
  const prev = () => {
    if (currentLeft <= 1) return;
    goTo(currentLeft === 2 ? 1 : Math.max(currentLeft - 2, 1));
  };
  const leftFor = (pageNum) => {
    if (pageNum <= 1) return 1;
    return pageNum % 2 === 0 ? pageNum : pageNum - 1;
  };

  /* Miniatures */
  const buildThumbs = async () => {
    if (!thumbsEl || !pdfDoc || thumbsEl.dataset.built === loadedPdfUrl) return;
    thumbsEl.innerHTML = '';
    thumbsEl.dataset.built = loadedPdfUrl;
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reader__thumb';
      btn.dataset.page = p;
      btn.setAttribute('aria-label', `Aller à la page ${p}`);
      const c = document.createElement('canvas');
      btn.appendChild(c);
      const lbl = document.createElement('span');
      lbl.textContent = p;
      btn.appendChild(lbl);
      btn.addEventListener('click', () => goTo(leftFor(p)));
      thumbsEl.appendChild(btn);
    }
    // Rendu séquentiel en basse résolution
    for (let p = 1; p <= totalPages; p++) {
      try {
        const page = await pdfDoc.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const scale = 72 / vp.height;
        const rvp = page.getViewport({ scale: scale * 2 });
        const c = thumbsEl.querySelector(`[data-page="${p}"] canvas`);
        if (!c) return;
        c.width = rvp.width; c.height = rvp.height;
        c.style.height = '72px'; c.style.width = (rvp.width / 2) + 'px';
        await page.render({ canvasContext: c.getContext('2d'), viewport: rvp }).promise;
      } catch (_) {}
    }
  };
  const updateThumbs = (visible) => {
    if (!thumbsEl) return;
    thumbsEl.querySelectorAll('.reader__thumb').forEach(b => {
      const on = visible.includes(parseInt(b.dataset.page, 10));
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-current', on ? 'true' : 'false');
    });
    const active = thumbsEl.querySelector('.reader__thumb.is-active');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };

  const openReader = async () => {
    lastFocus = document.activeElement;
    const url = openBtn.dataset.pdf;
    reader.classList.add('is-open');
    reader.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loading.hidden = false;
    closeBtn.focus();
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
      buildThumbs();
    } catch (err) {
      console.error('Gazette reader error:', err);
      loading.hidden = true;
    }
  };

  const closeReader = () => {
    cancelActive();
    reader.classList.remove('is-open');
    reader.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };

  openBtn.addEventListener('click', openReader);
  document.getElementById('openGazetteCover')?.addEventListener('click', openReader);
  closeBtn.addEventListener('click', closeReader);
  backdrop.addEventListener('click', closeReader);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  document.addEventListener('keydown', (e) => {
    if (!reader.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeReader();
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(1); }
    else if (e.key === 'End') { e.preventDefault(); goTo(leftFor(totalPages)); }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!reader.classList.contains('is-open')) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(showSpread, 150);
  });

  // Clic moitié gauche / droite pour tourner la page
  spread.addEventListener('click', (e) => {
    const r = spread.getBoundingClientRect();
    if ((e.clientX - r.left) < r.width / 2) prev(); else next();
  });

  // Swipe tactile
  let touchX = null;
  spread.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  spread.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
  }, { passive: true });
})();
