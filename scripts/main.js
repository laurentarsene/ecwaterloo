/* ══════════════════════════════════════════════════════════════
   ECW — main.js
   Interactions + animations GSAP
   ══════════════════════════════════════════════════════════════ */

document.body.classList.remove('no-js');

const hasGSAP = typeof gsap !== 'undefined';
if (hasGSAP && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════════════════════════════════════════════════════════
   PRELOADER
   ══════════════════════════════════════════════════════════════ */
(function () {
  const el = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  if (!el || !fill) return;
  let p = 0;
  const tick = () => {
    p += Math.random() * 18 + 6;
    if (p >= 100) { p = 100; fill.style.width = '100%'; done(); return; }
    fill.style.width = p + '%';
    setTimeout(tick, 110);
  };
  const done = () => {
    setTimeout(() => {
      el.classList.add('is-done');
      kickoffHeroIntro();
    }, 180);
  };
  setTimeout(tick, 80);
})();

/* ══════════════════════════════════════════════════════════════
   CURSEUR CUSTOM
   ══════════════════════════════════════════════════════════════ */
(function () {
  const cursor = document.getElementById('cursor');
  if (!cursor || !window.matchMedia('(hover: hover)').matches) return;
  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');

  let tx = 0, ty = 0, rx = 0, ry = 0;
  let raf;

  const loop = () => {
    rx += (tx - rx) * 0.18;
    ry += (ty - ry) * 0.18;
    dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    raf = requestAnimationFrame(loop);
  };

  window.addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!cursor.classList.contains('is-active')) cursor.classList.add('is-active');
  }, { passive: true });

  window.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));

  const hoverables = 'a, button, [data-magnetic], .service, .dono, .contact__card';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverables)) cursor.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverables)) cursor.classList.remove('is-hover');
  });

  loop();
})();

/* ══════════════════════════════════════════════════════════════
   NAV — scroll + mobile
   ══════════════════════════════════════════════════════════════ */
(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileNavClose');

  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const openMobile = () => {
    mobileNav.classList.add('is-open');
    mobileNav.setAttribute('aria-hidden', 'false');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const closeMobile = () => {
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle?.addEventListener('click', openMobile);
  mobileClose?.addEventListener('click', closeMobile);
  mobileNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeMobile(); });

  // Active link on scroll
  const links = document.querySelectorAll('[data-nav-link]');
  const sectionIds = [...links].map(l => l.getAttribute('href')).filter(h => h?.startsWith('#'));
  const sections = sectionIds.map(id => document.querySelector(id)).filter(Boolean);

  if ('IntersectionObserver' in window) {
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
   HERO — canvas particules + intro animation
   ══════════════════════════════════════════════════════════════ */
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mouse = { x: -9999, y: -9999 };
  let particles = [];

  const COUNT = () => Math.min(90, Math.floor((W * H) / 20000));
  const MAX_DIST = 140;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = [];
    const n = COUNT();
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.8,
      });
    }
  };

  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }, { passive: true });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  const inkRGB = '21, 17, 13';
  const coralRGB = '224, 83, 47';

  const draw = () => {
    if (prefersReducedMotion) return;
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      // Attraction douce vers le curseur
      const dxm = mouse.x - p.x;
      const dym = mouse.y - p.y;
      const dm2 = dxm * dxm + dym * dym;
      if (dm2 < 200 * 200) {
        const f = 0.0006;
        p.vx += dxm * f;
        p.vy += dym * f;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.992;
      p.vy *= 0.992;

      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      p.x = Math.max(0, Math.min(W, p.x));
      p.y = Math.max(0, Math.min(H, p.y));
    });

    // Lignes
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * 0.22;
          ctx.strokeStyle = `rgba(${inkRGB}, ${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Points
    particles.forEach(p => {
      const dxm = mouse.x - p.x, dym = mouse.y - p.y;
      const near = Math.sqrt(dxm * dxm + dym * dym) < 120;
      ctx.fillStyle = near ? `rgba(${coralRGB}, 0.9)` : `rgba(${inkRGB}, 0.55)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  };

  resize();
  if (!prefersReducedMotion) draw();
})();

/* ══════════════════════════════════════════════════════════════
   HERO — intro reveal (appelé après preloader)
   ══════════════════════════════════════════════════════════════ */
function kickoffHeroIntro() {
  if (!hasGSAP || prefersReducedMotion) {
    document.querySelectorAll('.hero__line .split, .hero__amp').forEach(el => { el.style.transform = 'translateY(0)'; });
    document.querySelectorAll('.hero__actions, .hero__scroll').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  const tl = gsap.timeline({ delay: 0.1 });
  tl.from('.hero__kicker', { opacity: 0, y: 10, duration: 0.6, ease: 'power3.out' }, 0)
    .fromTo('.hero__line .split, .hero__amp',
      { y: '110%' },
      { y: '0%', duration: 1.1, ease: 'expo.out', stagger: 0.08 },
      0.15)
    .to('.hero__actions', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.9)
    .to('.hero__scroll', { opacity: 1, duration: 0.6 }, 1.15);
}

/* ══════════════════════════════════════════════════════════════
   SPLIT UTILITIES — word wrap pour reveals
   ══════════════════════════════════════════════════════════════ */
function splitIntoWords(el) {
  if (el.dataset.split === 'done') return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  textNodes.forEach(tn => {
    const parts = tn.nodeValue.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    parts.forEach(p => {
      if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
      if (p.length === 0) return;
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
  if (!hasGSAP || prefersReducedMotion) return;

  // Titres de section : reveal par mot au scroll (fade + rise)
  document.querySelectorAll('[data-split-lines]').forEach(el => {
    splitIntoWords(el);
    const words = el.querySelectorAll('.word');
    words.forEach(w => { w.style.display = 'inline-block'; });
    gsap.fromTo(words,
      { y: 32, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.9, ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 82%' }
      }
    );
  });

  // Reveal par mot (opacité progressive)
  document.querySelectorAll('[data-reveal-words]').forEach(el => {
    splitIntoWords(el);
    const words = el.querySelectorAll('.word');
    words.forEach(w => { w.classList.add('word--dim'); });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      end: 'bottom 60%',
      scrub: 0.6,
      onUpdate: (self) => {
        const cutoff = Math.ceil(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('is-lit', i < cutoff));
      }
    });
  });

  // Section-kicker + section-sub : fade up
  document.querySelectorAll('.section-kicker, .section-sub').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 14 },
      {
        opacity: 1, y: 0,
        duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      }
    );
  });

  // Histoire : timeline draw + event reveal
  const histoire = document.getElementById('histoire');
  if (histoire) {
    ScrollTrigger.create({
      trigger: histoire,
      start: 'top 70%',
      onEnter: () => histoire.classList.add('is-in-view')
    });
  }

  // Compteurs
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => { el.textContent = Math.floor(obj.v) + suffix; }
        });
      }
    });
  });

  // Services : stagger
  gsap.from('.service', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: { amount: 0.5, grid: 'auto', from: 'start' },
    scrollTrigger: { trigger: '.services__grid', start: 'top 78%' }
  });

  // Workflow : draw line progressif + activation steps
  const wfPath = document.querySelector('.wf__path-line');
  const wfSteps = document.querySelectorAll('.wf__step');
  const wf = document.querySelector('.wf');
  if (wfPath && wf) {
    ScrollTrigger.create({
      trigger: wf,
      start: 'top 70%',
      end: 'bottom 75%',
      scrub: 0.5,
      onUpdate: (self) => {
        wfPath.style.strokeDashoffset = 1 - self.progress;
      }
    });
    wfSteps.forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 68%',
        end: 'bottom 32%',
        toggleClass: { targets: step, className: 'is-active' }
      });
      // Subtle entrance
      gsap.from(step.querySelector('.wf__content'), {
        y: 20, opacity: 0, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: step, start: 'top 80%' }
      });
    });
  }

  // Étudiants : fade in
  gsap.from('.etu__text > *', {
    y: 20, opacity: 0, duration: 0.7, ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.etu__text', start: 'top 80%' }
  });
  gsap.from('.etu__card', {
    x: 30, opacity: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '.etu__card', start: 'top 80%' }
  });
  gsap.from('.etu__card-stat', {
    scale: 0.85, opacity: 0, duration: 0.5, ease: 'back.out(1.6)',
    stagger: 0.06,
    scrollTrigger: { trigger: '.etu__card-stats', start: 'top 85%' }
  });

  // Bénévoles : image parallax
  gsap.to('.benev__img', {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: '.benev', start: 'top bottom', end: 'bottom top', scrub: true }
  });
  gsap.from('.benev__badge', {
    scale: 0.8, opacity: 0, duration: 0.6, ease: 'back.out(1.8)',
    stagger: 0.15,
    scrollTrigger: { trigger: '.benev__visual', start: 'top 75%' }
  });
  gsap.from('.benev__steps li', {
    x: -10, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.08,
    scrollTrigger: { trigger: '.benev__steps', start: 'top 85%' }
  });

  // Soutenir : cards fade+rise
  gsap.from('.dono', {
    y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
    scrollTrigger: { trigger: '.soutenir__grid', start: 'top 78%' }
  });
  gsap.from('.soutenir__free', {
    y: 20, opacity: 0, duration: 0.7, ease: 'power3.out',
    scrollTrigger: { trigger: '.soutenir__free', start: 'top 88%' }
  });

  // Contact : fade
  gsap.from('.contact__card', {
    y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1,
    scrollTrigger: { trigger: '.contact__grid', start: 'top 82%' }
  });

  // Impact : fade
  gsap.from('.impact__item, .impact__rule', {
    opacity: 0, y: 14, duration: 0.6, ease: 'power3.out', stagger: 0.06,
    scrollTrigger: { trigger: '.impact', start: 'top 85%' }
  });

  // Manifesto signature
  gsap.from('.manifesto__signature', {
    y: 20, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: { trigger: '.manifesto__signature', start: 'top 85%' }
  });

  // Temps forts : alternating slide + media zoom
  document.querySelectorAll('.temps-item').forEach((item, idx) => {
    const media = item.querySelector('.temps-media');
    const text = item.querySelector('.temps-text');
    const caption = item.querySelector('.temps-caption');
    const sticker = item.querySelector('.temps-sticker');
    const img = item.querySelector('.temps-media__img');
    const reverse = item.classList.contains('temps-item--reverse');

    gsap.from(media, {
      x: reverse ? 40 : -40,
      opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 75%' }
    });
    gsap.from(text, {
      x: reverse ? -30 : 30,
      opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: item, start: 'top 75%' }
    });
    if (img) {
      gsap.fromTo(img,
        { scale: 1.15 },
        { scale: 1, duration: 1.8, ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 80%' } }
      );
      // Subtle parallax
      gsap.to(img, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
    if (caption) {
      gsap.from(caption, {
        y: 15, opacity: 0, rotation: 0,
        duration: 0.8, ease: 'back.out(1.6)',
        delay: 0.3,
        scrollTrigger: { trigger: item, start: 'top 70%' }
      });
    }
    if (sticker) {
      gsap.from(sticker, {
        scale: 0, rotation: 0,
        duration: 0.7, ease: 'back.out(2)',
        delay: 0.5,
        scrollTrigger: { trigger: item, start: 'top 75%' }
      });
    }
  });

  // Temps forts : duo Noël — fade in staggered
  gsap.from('.temps-duo__block', {
    y: 30, opacity: 0, duration: 0.7, ease: 'power3.out',
    stagger: 0.15,
    scrollTrigger: { trigger: '.temps-duo', start: 'top 80%' }
  });

  // Temps forts : stats
  gsap.from('.temps-stat', {
    y: 15, opacity: 0, duration: 0.5, ease: 'power2.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.temps-stats', start: 'top 85%' }
  });

  // Moments rail : subtle fade in on scroll (mais laisse l'animation CSS continuer)
  gsap.from('.moments__item', {
    opacity: 0, y: 20, duration: 0.6, ease: 'power2.out',
    stagger: 0.04,
    scrollTrigger: { trigger: '.moments', start: 'top 85%' }
  });
})();

/* ══════════════════════════════════════════════════════════════
   BOUTONS MAGNÉTIQUES
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.matchMedia('(hover: hover)').matches || prefersReducedMotion) return;
  const els = document.querySelectorAll('[data-magnetic]');
  els.forEach(el => {
    const strength = 0.35;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0, 0)'; });
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
   SCROLL PROGRESS + SIDE NAV
   ══════════════════════════════════════════════════════════════ */
(function () {
  const progressFill = document.getElementById('scrollProgressFill');
  const sideNav = document.getElementById('sideNav');
  if (!progressFill && !sideNav) return;

  const sideLinks = sideNav ? [...sideNav.querySelectorAll('[data-side-link]')] : [];
  const sections = sideLinks.map(a => {
    const id = a.getAttribute('href').replace('#', '');
    return { link: a, id, el: id === 'top' ? document.body : document.getElementById(id) };
  }).filter(s => s.el);

  // Sections à fond sombre pour adapter la couleur de la sidenav
  const darkIds = new Set(['services', 'etudiants', 'contact']);
  const darkEls = [...darkIds].map(id => document.getElementById(id)).filter(Boolean);

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const p = docHeight > 0 ? scrollTop / docHeight : 0;

    if (progressFill) progressFill.style.width = (p * 100).toFixed(2) + '%';

    // Montre la sidenav après avoir passé le hero
    if (sideNav) {
      const past = scrollTop > window.innerHeight * 0.5;
      sideNav.classList.toggle('is-visible', past);
    }

    // Détection de section active (centre viewport)
    if (sections.length) {
      const midY = scrollTop + window.innerHeight * 0.4;
      let activeId = sections[0].id;
      for (const s of sections) {
        const el = s.id === 'top' ? document.body : s.el;
        const rect = el.getBoundingClientRect();
        const top = rect.top + scrollTop;
        if (top <= midY) activeId = s.id;
      }
      sections.forEach(s => s.link.classList.toggle('is-active', s.id === activeId));
    }

    // Sidenav sur fond sombre ?
    if (sideNav) {
      const navCenter = window.innerHeight / 2;
      const onDark = darkEls.some(el => {
        const r = el.getBoundingClientRect();
        return r.top < navCenter && r.bottom > navCenter;
      });
      sideNav.classList.toggle('on-dark', onDark);
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
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
   FAILSAFE : si GSAP ne charge pas, on révèle le hero
   ══════════════════════════════════════════════════════════════ */
setTimeout(() => {
  if (!hasGSAP) kickoffHeroIntro();
}, 1800);
