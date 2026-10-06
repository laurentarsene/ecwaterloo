/* ══════════════════════════════════════════════════════════════
   ECW — chatbot.js
   Faux chatbot FAQ : un personnage flottant, des questions
   pré-écrites, des réponses fixes. Aucune IA, aucun réseau.
   ══════════════════════════════════════════════════════════════ */

(function () {
  // [question, réponse, lien d'action éventuel [libellé, href]]
  const FAQ = [
    ['Combien ça coûte ?', "Le premier rendez-vous et l'accompagnement sont gratuits. À l'épicerie, vous payez une contribution solidaire, à prix réduit, pour les produits que vous choisissez."],
    ["Comment accéder à l'épicerie ?", "Tout commence par un premier rendez-vous, pour faire le point sur votre situation. Une carte d'accès vous est ensuite remise.", ['Prendre rendez-vous', '/aide/#rdv']],
    ['Que dois-je apporter ?', 'Rien pour le premier rendez-vous. Vous venez, et nous discutons.'],
    ['Est-ce confidentiel ?', "Oui. Ce que vous nous confiez reste entre vous et l'équipe."],
    ['Je ne parle pas bien français', "Vous pouvez venir quand même. Le site existe aussi en anglais, ukrainien, arabe et d'autres langues.", ['Autres langues', '/bienvenue.html']],
    ['Je suis étudiant·e', "L'épicerie est réservée aux étudiant·es le premier jeudi du mois. Tu t'inscris en ligne et tu viens avec 5€ et un sac.", ["M'inscrire", '/etudiants/#inscription']],
    ['Où êtes-vous ?', 'Rue de la Station 139A, 1410 Waterloo. Les permanences se font sur rendez-vous.', ['Itinéraire', 'https://www.google.com/maps/dir/?api=1&destination=Rue+de+la+Station+139A,+1410+Waterloo']],
    ['Devenir bénévole', 'Avec plaisir ! Une heure par semaine suffit. Appelez-nous ou écrivez-nous, et passez faire connaissance.', ['Écrire un email', 'mailto:infos.ecwaterloo@gmail.com?subject=Devenir%20b%C3%A9n%C3%A9vole']],
    ['Faire un don', 'Chaque euro sert directement aux personnes accompagnées. Le paiement est sécurisé par Stripe.', ['Voir les montants', '/aider/#don']],
  ];
  const GREETING = 'Bonjour ! Je réponds aux questions qui nous sont posées le plus souvent. Choisissez-en une ci-dessous.';
  const EASE = 'cubic-bezier(.16,1,.3,1)';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mq = window.matchMedia('(max-width: 719.98px)');

  // ── DOM ──────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'bot';
  root.innerHTML = `
    <div class="bot__win" role="dialog" aria-label="Questions fréquentes" tabindex="-1" hidden>
      <div class="bot__head">
        <div><b>Une question&nbsp;?</b><span>Les réponses aux questions les plus fréquentes</span></div>
        <button type="button" class="bot__close" aria-label="Fermer">×</button>
      </div>
      <div class="bot__log" aria-live="polite"></div>
      <div class="bot__foot">
        <div class="bot__sugg"></div>
        <p>Pas trouvé&nbsp;? Appelez le <a href="tel:+32465927366">0465&nbsp;92&nbsp;73&nbsp;66</a></p>
      </div>
    </div>
    <div class="bot__teaser" hidden>
      <button type="button" class="bot__tease">Une question&nbsp;? Je peux vous aider.</button>
      <button type="button" class="bot__x" aria-label="Masquer">×</button>
    </div>
    <button type="button" class="bot__btn" aria-label="Ouvrir les questions fréquentes" aria-expanded="false">
      <img class="bot__idle" src="/assets/images/perso/bot-idle.webp" width="293" height="400" alt="">
      <img class="bot__hello" src="/assets/images/perso/bot-hello.webp" width="293" height="400" alt="">
    </button>
    <button type="button" class="bot__stand" aria-label="Fermer les questions fréquentes" aria-expanded="true">
      <img src="/assets/images/perso/bot-open.webp" width="324" height="600" alt="" loading="lazy">
    </button>`;
  document.body.appendChild(root);

  const win = root.querySelector('.bot__win');
  const log = root.querySelector('.bot__log');
  const sugg = root.querySelector('.bot__sugg');
  const teaser = root.querySelector('.bot__teaser');
  const btn = root.querySelector('.bot__btn');
  const stand = root.querySelector('.bot__stand');

  // ── État ─────────────────────────────────────────────────────
  let open = false, asked = [], showAll = false, typing = false, timer = 0, teaseOff = 0, lastFocus = null;

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  function bubble(text, me, link) {
    const row = el('div', 'msg' + (me ? ' msg--me' : ''));
    const b = el('div', 'msg__bubble');
    b.appendChild(el('span', '', text));
    if (link) {
      const [label, href] = link;
      const a = el('a', '', label);
      a.href = href;
      if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
      if (href.includes('#')) a.addEventListener('click', () => setOpen(false, { keepFocus: true }));
      b.appendChild(a);
    }
    row.appendChild(b);
    log.appendChild(row);
    log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }

  function renderSugg() {
    sugg.innerHTML = '';
    let list = FAQ.map((f, i) => ({ q: f[0], i })).filter(x => !asked.includes(x.i)).map(x => ({ q: x.q, go: () => ask(x.i) }));
    if (!showAll && list.length > 4) list = [...list.slice(0, 4), { q: 'Autres questions…', go: () => { showAll = true; renderSugg(); sugg.querySelector('button')?.focus(); } }];
    if (!list.length) list = [{ q: 'Revoir les questions', go: () => { asked = []; showAll = true; renderSugg(); } }];
    list.forEach(({ q, go }) => {
      const b = el('button', '', q);
      b.type = 'button';
      b.disabled = typing;
      b.addEventListener('click', go);
      sugg.appendChild(b);
    });
  }

  function ask(i) {
    if (typing) return;
    const [q, a, link] = FAQ[i];
    bubble(q, true);
    asked.push(i);
    typing = true;
    renderSugg();
    const dots = el('div', 'msg');
    dots.appendChild(el('div', 'msg__typing', '•••'));
    dots.setAttribute('aria-hidden', 'true');
    log.appendChild(dots);
    log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    clearTimeout(timer);
    timer = setTimeout(() => {
      dots.remove();
      typing = false;
      bubble(a, false, link);
      renderSugg();
      sugg.querySelector('button')?.focus({ preventScroll: true });
    }, reduced ? 0 : Math.min(1300, 450 + a.length * 6));
  }

  // ── Ouverture / fermeture ────────────────────────────────────
  function hideTeaser() { teaser.hidden = true; clearTimeout(teaseOff); }

  function setOpen(v, { keepFocus = false } = {}) {
    if (v === open) return;
    open = v;
    hideTeaser();
    root.classList.toggle('is-open', open);
    root.classList.remove('is-away');
    win.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fermer les questions fréquentes' : 'Ouvrir les questions fréquentes');
    if (open) {
      lastFocus = document.activeElement;
      if (!reduced) {
        win.style.transformOrigin = '100% 100%';
        win.animate([{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: EASE });
        if (!mq.matches) stand.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: EASE });
      }
      (sugg.querySelector('button') || win).focus({ preventScroll: true });
    } else if (!keepFocus) {
      (lastFocus && document.contains(lastFocus) ? lastFocus : btn).focus({ preventScroll: true });
    }
  }

  btn.addEventListener('click', () => setOpen(!open));
  stand.addEventListener('click', () => setOpen(false));
  root.querySelector('.bot__close').addEventListener('click', () => setOpen(false));
  root.querySelector('.bot__tease').addEventListener('click', () => setOpen(true));
  root.querySelector('.bot__x').addEventListener('click', hideTeaser);
  document.querySelectorAll('[data-open-chat]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); setOpen(true); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });

  // Mobile : le personnage reste sous la fenêtre (pas de personnage en pied)
  const applyMq = () => root.classList.toggle('is-mobile', mq.matches);
  mq.addEventListener ? mq.addEventListener('change', applyMq) : mq.addListener(applyMq);
  applyMq();

  // Mobile, tout en haut de page : le personnage s'efface pour ne pas couvrir le héro
  let teasePending = false;
  const updateAway = () => {
    const away = mq.matches && window.scrollY < 160 && !open;
    root.classList.toggle('is-away', away);
    if (!away && teasePending) { teasePending = false; showTeaser(); }
  };
  window.addEventListener('scroll', updateAway, { passive: true });
  mq.addEventListener ? mq.addEventListener('change', updateAway) : mq.addListener(updateAway);
  updateAway();

  // Le personnage rapetisse quand on descend, reprend sa taille quand on remonte
  let lastY = window.scrollY, small = false;
  window.addEventListener('scroll', () => {
    const y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) <= 6) return;
    const s = dy > 0 && y > 80;
    if (s !== small) { small = s; root.classList.toggle('is-small', small); }
    lastY = y;
  }, { passive: true });

  // Teaser : une seule fois par visite, 6s après le chargement, 8s à l'écran
  let seen = false;
  try { seen = sessionStorage.getItem('ecw-bot-teaser') === '1'; } catch (_) {}
  function showTeaser() {
    if (open) return;
    if (root.classList.contains('is-away')) { teasePending = true; return; }
    teaser.hidden = false;
    try { sessionStorage.setItem('ecw-bot-teaser', '1'); } catch (_) {}
    teaseOff = setTimeout(() => { teaser.hidden = true; }, 8000);
  }
  if (!seen) setTimeout(showTeaser, 6000);

  bubble(GREETING, false);
  renderSugg();
})();
