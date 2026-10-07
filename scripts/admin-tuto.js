// ═══════════════════════════════════════════════════════
//  ECW Admin — visite guidée
//  Se lance à la première connexion d'un compte (mémorisé sur le compte, donc
//  sur tous les appareils), peut être passée à tout moment, et relancée avec
//  le bouton « Visite guidée » du menu.
// ═══════════════════════════════════════════════════════

const ETAPES_TUTO = [
  { titre: 'Bienvenue dans l\'espace admin', texte: 'Cette visite montre en deux minutes où se trouve chaque chose et comment faire les actions du quotidien. Vous pouvez la passer maintenant et la revoir quand vous voulez avec le bouton « Visite guidée » du menu (le point d\x27interrogation, sur téléphone).' },
  { cible: '.nav__items', titre: 'Le menu', texte: 'Six rubriques, toujours à portée de main. Les pastilles signalent ce qui attend : en rouge, les bénévoles à valider ; en bleu, les étudiant·es en liste d\'attente.' },
  { cible: '#aFaire', titre: 'À faire', texte: 'En arrivant, commencez par ici : uniquement ce qui demande une action (une validation, une épicerie qui approche, un créneau qui manque de monde, une Gazette à envoyer). Chaque carte a son bouton pour agir tout de suite.' },
  { cible: '.cal-a', titre: 'L\'agenda', texte: 'Tout ce qui a une date au même endroit : l\'épicerie étudiante (en bleu), les créneaux bénévoles (une couleur par activité) et les événements (en rose). Cliquez sur un élément pour voir qui est inscrit ; cliquez sur un jour pour y ajouter quelque chose.' },
  { cible: '.cal-a__cases', titre: 'Déplacer en glissant', texte: 'Pour changer une date, glissez l\'élément sur un autre jour (sur téléphone : appui long, puis glisser). Rien n\'est enregistré tout de suite : une fenêtre montre d\'abord qui sera prévenu par e-mail et ce qui pourrait poser problème.' },
  { cible: '#calAjouter', titre: 'Ajouter', texte: 'Un créneau bénévole, une série de créneaux d\'un coup (par exemple la distribution chaque premier mardi du mois), ou un événement annoncé sur le site.' },
  { cible: '.nav__item[data-tab="benevoles"]', titre: 'Bénévoles', texte: 'Les bénévoles s\'inscrivent seul·es sur le site et confirment leur e-mail ; il vous reste à valider leur venue. Vous y gérez aussi les créneaux et les activités, et vous pouvez inscrire vous-même quelqu\'un qui a appelé.' },
  { cible: '.nav__item[data-tab="etudiants"]', titre: 'Épicerie étudiante', texte: 'La prochaine date, les places et la liste d\'attente, la liste des inscrit·es pour le jour J, et les douze prochains mois : changer une date, le nombre de places, ou annuler un mois. Les personnes concernées sont prévenues automatiquement.' },
  { cible: '.nav__item[data-tab="site"]', titre: 'Contenus du site', texte: 'Ce que voient les visiteurs et qui change souvent : l\'agenda et les nouvelles, les besoins du moment (couches, pâtes…), la Gazette à mettre en ligne et à envoyer, et les chiffres de la page Impact.' },
  { cible: '.nav__item[data-tab="reglages"]', titre: 'Réglages', texte: 'Les quelques réglages généraux : quand s\'ouvrent les inscriptions étudiantes, le nombre de places par défaut, l\'objectif des lutins de Noël, et l\'adresse qui reçoit les alertes.' },
  { cible: '#tutoRelancer', titre: 'C\'est tout !', texte: 'Un doute plus tard ? Ce bouton relance la visite. Et rien n\'est jamais envoyé ni supprimé sans une fenêtre qui explique ce qui va se passer : vous pouvez explorer sans crainte.' },
];

const TUTO = { i: 0, el: null, lance: false };

async function lancerTuto() {
  showTab('accueil');
  for (let k = 0; k < 40 && !document.querySelector('#aFaire > *'); k++) await new Promise(r => setTimeout(r, 100));
  if (!TUTO.el) {
    document.body.insertAdjacentHTML('beforeend', `<div class="tuto" id="tuto">
      <div class="tuto__trou" aria-hidden="true"></div>
      <section class="tuto__bulle" role="dialog" aria-modal="true" aria-labelledby="tutoTitre" aria-describedby="tutoTexte">
        <div class="tuto__points" aria-hidden="true"></div>
        <h2 id="tutoTitre" class="tuto__t"></h2>
        <p id="tutoTexte" class="tuto__p"></p>
        <div class="tuto__pied"><button type="button" class="tuto__passer">Passer la visite</button>
          <div><button type="button" class="btn btn--ghost btn--sm tuto__prec">Précédent</button> <button type="button" class="btn btn--primary btn--sm tuto__suiv">Suivant</button></div></div>
      </section></div>`);
    TUTO.el = document.getElementById('tuto');
    TUTO.el.querySelector('.tuto__passer').onclick = () => finirTuto();
    TUTO.el.querySelector('.tuto__prec').onclick = () => montrerEtape(TUTO.i - 1);
    TUTO.el.querySelector('.tuto__suiv').onclick = () => TUTO.i === ETAPES_TUTO.length - 1 ? finirTuto() : montrerEtape(TUTO.i + 1);
    TUTO.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') finirTuto();
      if (e.key === 'ArrowRight' && TUTO.i < ETAPES_TUTO.length - 1) montrerEtape(TUTO.i + 1);
      if (e.key === 'ArrowLeft' && TUTO.i > 0) montrerEtape(TUTO.i - 1);
      if (e.key === 'Tab') { // la tabulation reste dans la bulle
        const f = [...TUTO.el.querySelectorAll('button:not([hidden])')]; const k = f.indexOf(document.activeElement);
        e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    addEventListener('resize', () => TUTO.el.classList.contains('is-on') && placer());
    addEventListener('scroll', () => TUTO.el.classList.contains('is-on') && placer(), { passive: true });
  }
  TUTO.el.classList.add('is-on'); document.body.classList.add('tuto-ouvert');
  montrerEtape(0);
}

function montrerEtape(i) {
  TUTO.i = Math.max(0, Math.min(i, ETAPES_TUTO.length - 1));
  const e = ETAPES_TUTO[TUTO.i], el = TUTO.el;
  el.querySelector('.tuto__t').textContent = e.titre;
  el.querySelector('.tuto__p').textContent = e.texte;
  el.querySelector('.tuto__points').innerHTML = ETAPES_TUTO.map((_, k) => `<i class="${k === TUTO.i ? 'is-on' : k < TUTO.i ? 'is-vu' : ''}"></i>`).join('');
  el.querySelector('.tuto__prec').hidden = TUTO.i === 0;
  el.querySelector('.tuto__passer').hidden = TUTO.i === ETAPES_TUTO.length - 1;
  el.querySelector('.tuto__suiv').textContent = TUTO.i === 0 ? 'Commencer la visite' : TUTO.i === ETAPES_TUTO.length - 1 ? 'Terminer' : 'Suivant';
  const cible = e.cible && document.querySelector(e.cible);
  if (cible) cible.scrollIntoView({ block: cible.offsetHeight > innerHeight * 0.6 ? 'start' : 'center', inline: 'nearest', behavior: 'instant' });
  placer();
  el.querySelector('.tuto__suiv').focus();
}

function placer() {
  const e = ETAPES_TUTO[TUTO.i], el = TUTO.el;
  const trou = el.querySelector('.tuto__trou'), bulle = el.querySelector('.tuto__bulle');
  const cible = e.cible && document.querySelector(e.cible);
  const W = innerWidth, H = innerHeight, m = 8;
  if (!cible) {
    Object.assign(trou.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
    el.classList.add('is-centre'); bulle.style.left = bulle.style.top = ''; return;
  }
  el.classList.remove('is-centre');
  const r = cible.getBoundingClientRect();
  const x = Math.max(4, r.left - m), y = Math.max(4, r.top - m), w = Math.min(W - 8, r.width + 2 * m), h = Math.min(H - 8 - Math.max(0, y - 4) + 4, r.height + 2 * m);
  Object.assign(trou.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  if (W < 640) { bulle.style.left = bulle.style.top = ''; el.classList.add('is-bas'); return; }
  el.classList.remove('is-bas');
  const bw = bulle.offsetWidth, bh = bulle.offsetHeight, g = 14;
  let left, top;
  if (r.right + g + bw < W - 12 && r.width < W * 0.4) { left = r.right + g; top = r.top + r.height / 2 - bh / 2; }      // à droite (menu)
  else if (y + h + g + bh < H - 12) { left = r.left + r.width / 2 - bw / 2; top = y + h + g; }                           // dessous
  else if (y - g - bh > 12) { left = r.left + r.width / 2 - bw / 2; top = y - g - bh; }                                  // dessus
  else { left = W - bw - 24; top = H - bh - 24; }                                                                        // dans un coin
  bulle.style.left = Math.max(12, Math.min(left, W - bw - 12)) + 'px';
  bulle.style.top = Math.max(12, Math.min(top, H - bh - 12)) + 'px';
}

async function finirTuto() {
  TUTO.el.classList.remove('is-on'); document.body.classList.remove('tuto-ouvert');
  try { localStorage.setItem('ecw-tuto-admin', '1'); } catch (_) {}
  try { await sb.auth.updateUser({ data: { tuto_admin_vu: new Date().toISOString() } }); } catch (_) {}
  document.getElementById('tutoRelancer')?.focus();
}

document.getElementById('tutoRelancer')?.addEventListener('click', lancerTuto);
sb.auth.onAuthStateChange((ev, session) => {
  if (!session || TUTO.lance) return;
  let vu = !!session.user?.user_metadata?.tuto_admin_vu;
  try { vu = vu || localStorage.getItem('ecw-tuto-admin') === '1'; } catch (_) {}
  if (vu) return;
  TUTO.lance = true;
  setTimeout(lancerTuto, 900);
});
