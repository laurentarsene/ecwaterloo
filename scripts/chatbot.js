/* ══════════════════════════════════════════════════════════════
   ECW — chatbot.js
   Faux chatbot scénarisé : questions pré-écrites, réponses fixes.
   Aucune IA, aucun réseau — tout est dans QA ci-dessous.
   ══════════════════════════════════════════════════════════════ */

(function () {
  const TEL = '<a href="tel:+32465927366">0465 92 73 66</a>';
  const MAIL = '<a href="mailto:infos.ecwaterloo@gmail.com">infos.ecwaterloo@gmail.com</a>';

  const QA = {
    aide: {
      q: "Comment obtenir de l'aide ?",
      a: `C'est simple : vous <a href="#rdv" data-close>prenez rendez-vous</a> ou vous appelez le ${TEL}. La première visite, c'est un café et une conversation — rien à préparer, rien à apporter. Ensuite on regarde ensemble par où commencer : alimentation, logement, emploi, santé, papiers ou budget.`,
      follow: ['gratuit', 'ou', 'langue'],
    },
    gratuit: {
      q: "C'est vraiment gratuit ?",
      a: `Oui, tout est gratuit, confidentiel et sans jugement. L'association est 100% bénévole depuis 2014 — personne n'est payé, et rien ne vous sera demandé en échange.`,
      follow: ['aide', 'qui'],
    },
    etudiant: {
      q: "L'épicerie étudiante, ça marche comment ?",
      a: `Chaque <strong>premier jeudi du mois</strong>, l'épicerie est ouverte aux étudiant·es pour <strong>5€</strong> (à apporter le jour J, avec un sac). L'inscription en ligne est obligatoire — elle prend 30 secondes dans la <a href="#etudiants" data-close>section Étudiants</a>, et tu reçois l'adresse par email.`,
      follow: ['ou', 'aide'],
    },
    benevole: {
      q: "Comment devenir bénévole ?",
      a: `Chacun·e apporte ce qu'il a : une heure par semaine, une voiture, une langue, deux bras. On cherche du renfort en logistique, accompagnement, cuisine, transport, administratif, traduction, potager et événements. Appelez le ${TEL} ou écrivez à ${MAIL} — voir <a href="#benevoles" data-close>Donner du temps</a>.`,
      follow: ['lutin', 'don'],
    },
    don: {
      q: "Comment faire un don ?",
      a: `Dans la <a href="#soutenir" data-close>section Faire un don</a> : 10€, 25€, 50€, 100€ ou un montant libre, par paiement sécurisé Stripe. Chaque euro arrive à destination — pas de salaire, pas de frais cachés. Les dons en nature (produits, fournitures) sont bienvenus aussi : passez à l'épicerie ou écrivez-nous.`,
      follow: ['benevole', 'lutin'],
    },
    lutin: {
      q: "C'est quoi, les lutins de Noël ?",
      a: `Chaque décembre, vous pouvez offrir un cadeau de Noël à un enfant de l'épicerie : vous vous inscrivez, vous recevez la lettre d'un enfant au Père Noël, vous déposez son cadeau — on le lui remet. Tout se passe dans la <a href="#lutins" data-close>section Devenez lutin·e</a>.`,
      follow: ['don', 'benevole'],
    },
    ou: {
      q: "Où êtes-vous ? Quels horaires ?",
      a: `<strong>Rue de la Station 139A, 1410 Waterloo</strong> — la carte est en <a href="#contact" data-close>bas de page</a>. Les permanences sont sur rendez-vous, du lundi au vendredi : appelez le ${TEL} ou <a href="#rdv" data-close>choisissez un créneau en ligne</a>.`,
      follow: ['aide', 'etudiant'],
    },
    langue: {
      q: "Je ne parle pas bien français…",
      a: `Pas de souci ! L'essentiel du site existe <a href="bienvenue.html">en 14 langues</a> (English, Nederlands, Українська, العربية, فارسی…). Et si vous venez, amenez si possible un proche qui peut traduire — sinon on se débrouillera ensemble.`,
      follow: ['aide', 'ou'],
    },
    gazette: {
      q: "C'est quoi, la gazette ?",
      a: `Notre journal papier, écrit par l'équipe deux fois par an : portraits, chroniques et vraies histoires du lieu. Vous pouvez la <a href="#gazette" data-close>feuilleter en ligne</a> ou télécharger le PDF.`,
      follow: ['qui', 'benevole'],
    },
    qui: {
      q: "Qui êtes-vous ?",
      a: `Une ASBL de quartier née en 2014 à Waterloo : une vingtaine de bénévoles, zéro salarié, plus de mille personnes accompagnées. On a commencé par une épicerie, puis on a écouté — et on a ajouté le logement, les papiers, l'emploi, la santé. Toute <a href="#asbl" data-close>notre histoire est ici</a>.`,
      follow: ['aide', 'don'],
    },
  };

  const PRIMARY = ['aide', 'etudiant', 'benevole', 'don', 'ou', 'langue'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── DOM ──────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'chat';
  root.innerHTML = `
    <button type="button" class="chat__fab" id="chatFab" aria-expanded="false" aria-controls="chatPanel" aria-label="Questions fréquentes">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
      <span>Questions</span>
    </button>
    <section class="chat__panel" id="chatPanel" role="dialog" aria-label="Questions fréquentes" hidden>
      <header class="chat__head">
        <div>
          <p class="chat__title">Espace Convivial de Waterloo</p>
          <p class="chat__sub">Réponses automatiques · pour un humain&nbsp;: <a href="tel:+32465927366">0465 92 73 66</a></p>
        </div>
        <button type="button" class="chat__close" id="chatClose" aria-label="Fermer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>
      <div class="chat__body" id="chatBody" aria-live="polite"></div>
    </section>`;
  document.body.appendChild(root);

  const fab = root.querySelector('#chatFab');
  const panel = root.querySelector('#chatPanel');
  const body = root.querySelector('#chatBody');
  const closeBtn = root.querySelector('#chatClose');

  const scrollDown = () => { body.scrollTop = body.scrollHeight; };

  const bubble = (cls, html) => {
    const el = document.createElement('div');
    el.className = 'chat__msg ' + cls;
    el.innerHTML = html;
    body.appendChild(el);
    scrollDown();
    return el;
  };

  const chips = (ids, label) => {
    const wrap = document.createElement('div');
    wrap.className = 'chat__chips';
    if (label) {
      const l = document.createElement('p');
      l.className = 'chat__chips-label';
      l.textContent = label;
      wrap.appendChild(l);
    }
    ids.forEach(id => {
      if (!QA[id]) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = QA[id].q;
      b.addEventListener('click', () => ask(id));
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollDown();
    return wrap;
  };

  const clearChips = () => body.querySelectorAll('.chat__chips').forEach(c => c.remove());

  function ask(id) {
    const item = QA[id];
    clearChips();
    bubble('chat__msg--user', item.q);
    const typing = bubble('chat__msg--bot chat__msg--typing', '<span></span><span></span><span></span>');
    const reveal = () => {
      typing.remove();
      const msg = bubble('chat__msg--bot', item.a);
      msg.querySelectorAll('a[data-close]').forEach(a => a.addEventListener('click', close));
      chips(item.follow, 'Et aussi :');
    };
    reduced ? reveal() : setTimeout(reveal, 650);
  }

  function greet() {
    if (body.childElementCount) return;
    bubble('chat__msg--bot', 'Bonjour ! Je suis le petit guide du site — je réponds instantanément aux questions les plus fréquentes. Choisissez la vôtre :');
    chips(PRIMARY.concat(['lutin', 'gazette', 'qui']));
  }

  const open = () => {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    greet();
    scrollDown();
  };
  const close = () => {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
  };

  fab.addEventListener('click', () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
})();
