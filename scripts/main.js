// Nav: transparent → frosted glass on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// Nav: mobile toggle
const toggle = document.getElementById('navToggle');
const links  = document.getElementById('navLinks');

toggle.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
});

links.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

// ─── Modal inscription étudiants ───
(function () {
  // Calcule le prochain 1er jeudi du mois (strictement après aujourd'hui)
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

  // Inject date everywhere
  const thursdayDisplay = document.getElementById('nextThursdayDisplay');
  if (thursdayDisplay) thursdayDisplay.textContent = nextThursdayStr;
  document.querySelectorAll('.thursday-ref').forEach(el => el.textContent = nextThursdayStr);
  const hiddenDate = document.getElementById('hiddenDateRdv');
  if (hiddenDate) hiddenDate.value = nextThursdayStr;

  // Elements
  const overlay   = document.getElementById('studentModal');
  const openBtn   = document.getElementById('openStudentForm');
  const closeBtn  = document.getElementById('closeStudentModal');
  const form      = document.getElementById('studentForm');
  const progressBar = document.getElementById('sformProgressBar');
  const successEl = document.getElementById('sformSuccess');

  if (!overlay || !openBtn) return;

  // Open / close
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
  closeBtn.addEventListener('click', closeModal);
  document.getElementById('closeSuccess')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal(); });

  // Step management
  let currentStep = 1;
  const TOTAL = 3; // form steps (2,3,4)

  function goToStep(n) {
    document.querySelectorAll('.sform-step').forEach(s => s.classList.remove('active'));
    const target = document.querySelector(`.sform-step[data-step="${n}"]`);
    if (target) {
      target.classList.add('active');
      currentStep = n;
    }
    // Progress: step1=0%, step2=33%, step3=66%, step4=99%
    const pct = n === 1 ? 0 : Math.round(((n - 1) / TOTAL) * 100);
    progressBar.style.width = pct + '%';
  }

  // Next buttons
  document.querySelectorAll('.sform-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) goToStep(currentStep + 1);
    });
  });

  // Prev buttons
  document.querySelectorAll('.sform-prev').forEach(btn => {
    btn.addEventListener('click', () => goToStep(currentStep - 1));
  });

  // Validation per step
  function validateStep(step) {
    let ok = true;

    // Clear previous errors
    document.querySelectorAll('.sform-input--error').forEach(el => el.classList.remove('sform-input--error'));
    document.getElementById('genreGroup')?.classList.remove('sform-radio-group--error');
    document.getElementById('engagementLabel')?.classList.remove('sform-checkbox--error');

    if (step === 2) {
      const prenom = document.getElementById('inputPrenom');
      const nom    = document.getElementById('inputNom');
      const genre  = document.querySelector('input[name="genre"]:checked');

      if (!prenom.value.trim()) { prenom.classList.add('sform-input--error'); ok = false; }
      if (!nom.value.trim())    { nom.classList.add('sform-input--error');    ok = false; }
      if (!genre)               { document.getElementById('genreGroup').classList.add('sform-radio-group--error'); ok = false; }

      if (!ok) (document.querySelector('.sform-input--error') || prenom).focus();
    }

    if (step === 3) {
      const email = document.getElementById('inputEmail');
      const tel   = document.getElementById('inputTel');

      if (!email.value.trim() || !/\S+@\S+\.\S+/.test(email.value)) { email.classList.add('sform-input--error'); ok = false; }
      if (!tel.value.trim())                                          { tel.classList.add('sform-input--error');   ok = false; }

      if (!ok) document.querySelector('.sform-input--error').focus();
    }

    if (step === 4) {
      const univ  = document.getElementById('inputUniv');
      const check = document.getElementById('engagementCheck');

      if (!univ.value.trim()) { univ.classList.add('sform-input--error'); ok = false; }
      if (!check.checked)     { document.getElementById('engagementLabel').classList.add('sform-checkbox--error'); ok = false; }

      if (!ok && !univ.value.trim()) univ.focus();
    }

    return ok;
  }

  // Stepper
  let nbPersonnes = 1;
  const stepperVal  = document.getElementById('stepperVal');
  const hiddenNb    = document.getElementById('hiddenNbPersonnes');
  const minusBtn    = document.getElementById('stepperMinus');
  const plusBtn     = document.getElementById('stepperPlus');

  function updateStepper() {
    stepperVal.textContent = nbPersonnes;
    hiddenNb.value = nbPersonnes;
    minusBtn.disabled = nbPersonnes <= 1;
    plusBtn.disabled  = nbPersonnes >= 10;
  }

  minusBtn.addEventListener('click', () => { if (nbPersonnes > 1)  { nbPersonnes--; updateStepper(); } });
  plusBtn.addEventListener('click',  () => { if (nbPersonnes < 10) { nbPersonnes++; updateStepper(); } });
  updateStepper();

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '…';

    const data = {
      prenom:      document.getElementById('inputPrenom').value.trim(),
      nom:         document.getElementById('inputNom').value.trim(),
      genre:       document.querySelector('input[name="genre"]:checked')?.value,
      email:       document.getElementById('inputEmail').value.trim(),
      telephone:   document.getElementById('inputTel').value.trim(),
      universite:  document.getElementById('inputUniv').value.trim(),
      nb_personnes: nbPersonnes,
      date_rdv:    nextThursdayStr,
    };

    // 1. Insérer dans Supabase
    const { createClient } = supabase;
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { error: insertError } = await sb
      .from('inscriptions_etudiantes')
      .insert([data]);

    if (insertError) {
      console.error(insertError);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Réessayer';
      return;
    }

    // 2. Email de confirmation via Edge Function (best-effort)
    sb.functions.invoke('send-email', {
      body: { type: 'confirmation', data }
    }).catch(err => console.warn('Email non envoyé :', err));

    // 3. Afficher la confirmation
    form.hidden = true;
    progressBar.style.width = '100%';
    successEl.hidden = false;
    document.getElementById('successDate').textContent = nextThursdayStr;
  });
})();

// Reveal on scroll
const revealEls = document.querySelectorAll('[data-reveal]');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const delay = parseInt(entry.target.dataset.delay || '0', 10);
    setTimeout(() => entry.target.classList.add('is-visible'), delay);
    observer.unobserve(entry.target);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => observer.observe(el));
