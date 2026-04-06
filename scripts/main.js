// Nav: transparent → frosted glass on scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// Nav: mobile toggle
const toggle    = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');
const mobileNavClose = document.getElementById('mobileNavClose');

function openMobileNav() {
  mobileNav.classList.add('is-open');
  mobileNav.setAttribute('aria-hidden', 'false');
  toggle.classList.add('is-open');
  toggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  mobileNav.classList.remove('is-open');
  mobileNav.setAttribute('aria-hidden', 'true');
  toggle.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

toggle.addEventListener('click', openMobileNav);
mobileNavClose.addEventListener('click', closeMobileNav);

mobileNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', closeMobileNav);
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

  // Supabase client (partagé dans tout le module)
  const { createClient } = supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Fenêtre d'inscription ─────────────────────────────
  async function initButtonState() {
    let joursMax = 3;
    try {
      const { data } = await sb.from('settings').select('value').eq('key', 'jours_inscription_max').single();
      if (data) joursMax = parseInt(data.value, 10);
    } catch (_) {}

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil   = Math.round((nextThursday - today) / 86400000);
    const daysUntilOpen = daysUntil - joursMax;

    const btn       = document.getElementById('openStudentForm');
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

// Workflow: progress line + ink-drop circle reveal
const workflowObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const step = entry.target;
    step.classList.add('is-active');
    const circle = step.querySelector('[data-circle-reveal]');
    if (circle) setTimeout(() => circle.classList.add('is-active'), 200);
    workflowObserver.unobserve(step);
  });
}, { threshold: 0.2 });

document.querySelectorAll('.workflow-step').forEach(el => workflowObserver.observe(el));

// ─── Back to top ────────────────────────────────────────────
const backToTopBtn = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTopBtn.classList.toggle('is-visible', window.scrollY > 400);
}, { passive: true });
backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ─── Chatbot ────────────────────────────────────────────────
(function () {
  const TREE = {
    start: {
      bot: "Bonjour 👋 Comment puis-je vous orienter ?",
      choices: [
        { label: "J'ai besoin d'aide",   next: 'need_help' },
        { label: "Je suis étudiant·e",   next: 'student'   },
        { label: "Devenir bénévole",     next: 'volunteer' },
        { label: "Soutenir l'ECW",       next: 'donate'    }
      ]
    },
    need_help: {
      bot: "Quel type d'aide vous faut-il ?",
      choices: [
        { label: "Alimentation",       next: 'help_food'  },
        { label: "Logement / Admin",   next: 'help_admin' },
        { label: "Emploi",             next: 'help_job'   },
        { label: "Autre besoin",       next: 'help_other' }
      ]
    },
    help_food:  { bot: "Nos distributions se font sur rendez-vous chaque semaine. N'hésitez pas à nous contacter.", action: { label: "Prendre rendez-vous →", href: "#rdv" }, choices: [] },
    help_admin: { bot: "Logement, justice, démarches admin… Nos bénévoles vous accompagnent à chaque étape.", action: { label: "Prendre rendez-vous →", href: "#rdv" }, choices: [] },
    help_job:   { bot: "Aide au CV, préparation aux entretiens, mise en relation avec des employeurs.", action: { label: "Prendre rendez-vous →", href: "#rdv" }, choices: [] },
    help_other: { bot: "Appelez-nous ou passez nous voir. Nous trouverons ensemble la meilleure solution.", action: { label: "Nous appeler", href: "tel:+32465927366" }, choices: [] },
    student: {
      bot: "Chaque premier jeudi du mois, nos portes s'ouvrent aux étudiant·e·s pour 5€ symboliques.",
      choices: [
        { label: "M'inscrire",     next: 'student_signup' },
        { label: "En savoir plus", next: 'student_info'   }
      ]
    },
    student_signup: { bot: "L'inscription prend 30 secondes. Rendez-vous sur la section étudiants !", action: { label: "S'inscrire →", href: "#etudiants" }, choices: [] },
    student_info:   { bot: "Tous les détails sont sur la page dédiée : horaires, adresse, règles.", action: { label: "Voir la section →", href: "#etudiants" }, choices: [] },
    volunteer: {
      bot: "Génial ! Aucune compétence particulière requise — juste de la bonne volonté.",
      choices: [
        { label: "Comment ça fonctionne ?", next: 'volunteer_how'  },
        { label: "Je suis partant·e !",     next: 'volunteer_join' }
      ]
    },
    volunteer_how:  { bot: "Chaque bénévole est formé et accompagné. Une réunion d'intégration est organisée régulièrement.", action: { label: "En savoir plus →", href: "#benevoles" }, choices: [] },
    volunteer_join: { bot: "Super ! Rendez-vous sur notre page bénévoles pour rejoindre l'équipe.", action: { label: "Rejoindre l'équipe →", href: "#benevoles" }, choices: [] },
    donate: {
      bot: "Merci pour votre générosité 🙏 Comment souhaitez-vous nous aider ?",
      choices: [
        { label: "Don financier",      next: 'donate_money' },
        { label: "Don en nature",      next: 'donate_goods' },
        { label: "Parler de nous",     next: 'donate_share' }
      ]
    },
    donate_money: { bot: "Chaque don, même modeste, fait une vraie différence. Retrouvez notre IBAN sur la page soutien.", action: { label: "Faire un don →", href: "#soutenir" }, choices: [] },
    donate_goods: { bot: "Vêtements, nourriture, matériel scolaire… Contactez-nous pour organiser un dépôt.", action: { label: "Nous contacter →", href: "#contact" }, choices: [] },
    donate_share: { bot: "Parlez de nous autour de vous ! La visibilité nous aide énormément.", action: { label: "Découvrir l'ECW →", href: "#mission" }, choices: [] }
  };

  const trigger    = document.getElementById('chatTrigger');
  const panel      = document.getElementById('chatPanel');
  const closeBtn   = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const choicesEl  = document.getElementById('chatChoices');
  const backBtn    = document.getElementById('chatBack');

  let isOpen = false;
  let history = []; // [{ nodeId, userLabel }]
  let initialized = false;

  function openChat() {
    isOpen = true;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.querySelector('.chat-trigger__icon--open').style.display  = 'none';
    trigger.querySelector('.chat-trigger__icon--close').style.display = '';
    trigger.querySelector('.chat-trigger__label').textContent = 'Fermer';
    if (!initialized) { initialized = true; showNode('start', null); }
  }

  function closeChat() {
    isOpen = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.querySelector('.chat-trigger__icon--open').style.display  = '';
    trigger.querySelector('.chat-trigger__icon--close').style.display = 'none';
    trigger.querySelector('.chat-trigger__label').textContent = 'Aide';
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
    rebuildFromHistory();
  }

  function rebuildFromHistory() {
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

  function renderBack() {
    backBtn.hidden = history.length <= 1;
  }

  backBtn.addEventListener('click', goBack);

  function scrollBottom() {
    setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
  }
})();
