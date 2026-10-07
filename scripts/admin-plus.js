// ═══════════════════════════════════════════════════════
//  ECW Admin — fenêtres de décision, épicerie étudiante, bénévoles, contenus du site, réglages
//  S'appuie sur `sb` et `esc` définis dans admin.js
// ═══════════════════════════════════════════════════════

const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const api = async (body) => {
  const { data, error } = await sb.functions.invoke('ecw-api', { body });
  if (error) {
    let code = 'serveur';
    try { code = (await error.context.json()).erreur || code; } catch (_) {}
    throw new Error(code);
  }
  return data;
};
const TZ = 'Europe/Brussels';
const fJour = (d) => new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d));
const fJourCourt = (d) => new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d));
const fHeure = (d) => { const p = new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)); const h = +p.find(x => x.type === 'hour').value, m = p.find(x => x.type === 'minute').value; return m === '00' ? `${h}h` : `${h}h${m}`; };
const fDateHeure = (d) => d ? new Intl.DateTimeFormat('fr-BE', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';
const isoLocal = (d) => { const x = new Date(d); const p = (n) => String(n).padStart(2, '0'); return { date: `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`, heure: `${p(x.getHours())}:${p(x.getMinutes())}` }; };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const COULEURS = { coral: '#f26d5f', teal: '#4d9aa8', olive: '#aeb02b', navy: '#1f3038', gold: '#e8b53a', blue: '#3a74e0' };
const NOMS_COULEURS = { coral: 'Corail', teal: 'Bleu canard', olive: 'Olive', navy: 'Marine', gold: 'Or', blue: 'Bleu' };

function toast(msg, ok = true) {
  let t = $('#adminToast');
  if (!t) { t = document.createElement('div'); t.id = 'adminToast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle('toast--err', !ok); t.classList.add('is-on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), 3200);
}
const erreur = (e) => toast(`Erreur : ${e.message || e}`, false);

// ── Formulaire en fenêtre (dialog) piloté par une liste de champs ─────────────
function formulaire({ titre, champs, valeurs = {}, valider = 'Enregistrer', supprimer, aide }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = `<form method="dialog" class="modal__form" novalidate>
      <div class="modal__head"><h2>${esc(titre)}</h2><button type="button" class="modal__x" aria-label="Fermer">×</button></div>
      ${aide ? `<p class="modal__aide">${aide}</p>` : ''}
      <div class="modal__body">${champs.map(champHtml(valeurs)).join('')}</div>
      <p class="modal__err" hidden></p>
      <div class="modal__foot">
        ${supprimer ? '<button type="button" class="btn btn--danger modal__suppr">Supprimer</button>' : '<span></span>'}
        <div><button type="button" class="btn btn--ghost modal__annuler">Annuler</button> <button type="submit" class="btn btn--primary">${esc(valider)}</button></div>
      </div></form>`;
    document.body.appendChild(d);
    const fin = (v) => { d.close(); d.remove(); resolve(v); };
    $('.modal__x', d).onclick = $('.modal__annuler', d).onclick = () => fin(null);
    d.addEventListener('cancel', (e) => { e.preventDefault(); fin(null); });
    if (supprimer) $('.modal__suppr', d).onclick = () => fin({ __supprimer: true });
    $('form', d).addEventListener('submit', (e) => {
      e.preventDefault();
      const v = {};
      for (const c of champs) {
        const el = d.querySelector(`[name="${c.nom}"]`);
        if (!el) continue;
        v[c.nom] = c.type === 'checkbox' ? el.checked : c.type === 'number' ? (el.value === '' ? null : Number(el.value)) : c.type === 'file' ? el.files[0] || null : el.value.trim();
        if (c.requis && (v[c.nom] === '' || v[c.nom] === null)) { const p = $('.modal__err', d); p.textContent = `« ${c.label} » est obligatoire.`; p.hidden = false; el.focus(); return; }
      }
      fin(v);
    });
    d.showModal();
    d.querySelector('input:not([type=hidden]), select, textarea')?.focus();
  });
}
function champHtml(valeurs) {
  return (c) => {
    const v = valeurs[c.nom] ?? c.defaut ?? '';
    const id = 'f_' + c.nom;
    const aide = c.aide ? `<small>${c.aide}</small>` : '';
    if (c.type === 'checkbox') return `<label class="fld fld--check"><input type="checkbox" name="${c.nom}" ${v ? 'checked' : ''}> <span>${esc(c.label)}</span>${aide}</label>`;
    if (c.type === 'textarea') return `<label class="fld" for="${id}"><span>${esc(c.label)}${c.requis ? ' *' : ''}</span><textarea id="${id}" name="${c.nom}" rows="${c.lignes || 3}">${esc(v)}</textarea>${aide}</label>`;
    if (c.type === 'select') return `<label class="fld" for="${id}"><span>${esc(c.label)}${c.requis ? ' *' : ''}</span><select id="${id}" name="${c.nom}">${c.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>${aide}</label>`;
    return `<label class="fld${c.demi ? ' fld--demi' : ''}" for="${id}"><span>${esc(c.label)}${c.requis ? ' *' : ''}</span><input id="${id}" name="${c.nom}" type="${c.type || 'text'}" value="${c.type === 'file' ? '' : esc(v)}" ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} ${c.accept ? `accept="${c.accept}"` : ''} ${c.placeholder ? `placeholder="${esc(c.placeholder)}"` : ''}>${aide}</label>`;
  };
}

// ── Fenêtre de décision : montre les conséquences avant d'agir ─────────────────
// points : [{ type: 'ok'|'info'|'attention'|'danger', html }] ; champs : comme formulaire() (+ si: 'nomCase')
// vivant(valeurs) : texte recalculé à chaque saisie ; bloque : désactive les actions
const ICONES = {
  ok: '<path d="M20 6 9 17l-5-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  attention: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  danger: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};
const icone = (t) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[t] || ICONES.info}</svg>`;

function decision({ titre, avant, apres, points = [], champs = [], valeurs = {}, actions, bloque = false, vivant }) {
  if (bloque) { champs = []; vivant = null; }
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'modal modal--decision';
    d.innerHTML = `<form method="dialog" class="modal__form" novalidate>
      <div class="modal__head"><h2>${esc(titre)}</h2><button type="button" class="modal__x" aria-label="Fermer">×</button></div>
      ${avant || apres ? `<div class="dz-move">${avant ? `<div class="dz-move__c dz-move__c--avant">${avant}</div><span class="dz-move__fl" aria-hidden="true">→</span>` : ''}<div class="dz-move__c dz-move__c--apres">${apres || ''}</div></div>` : ''}
      ${points.length ? `<ul class="dz-points">${points.map(p => `<li class="dz-point dz-point--${p.type}">${icone(p.type)}<div>${p.html}</div></li>`).join('')}</ul>` : ''}
      ${vivant ? '<div class="dz-vivant" aria-live="polite"></div>' : ''}
      ${champs.length ? `<div class="modal__body">${champs.map(c => `<div class="dz-champ" ${c.si ? `data-si="${c.si}"` : ''}>${champHtml(valeurs)(c)}</div>`).join('')}</div>` : ''}
      <p class="modal__err" hidden></p>
      <div class="modal__foot"><span></span><div>
        <button type="button" class="btn btn--ghost modal__annuler">${bloque ? 'Fermer' : 'Annuler'}</button>
        ${bloque ? '' : actions.map((a, k) => `<button type="${k === actions.length - 1 ? 'submit' : 'button'}" class="btn btn--${a.style || 'primary'}" data-valeur="${a.valeur}">${esc(a.label)}</button>`).join(' ')}
      </div></div></form>`;
    document.body.appendChild(d);
    const lire = () => { const v = {}; for (const c of champs) { const el = d.querySelector(`[name="${c.nom}"]`); if (el) v[c.nom] = c.type === 'checkbox' ? el.checked : c.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim(); } return v; };
    const majVue = () => {
      const v = lire();
      $$('.dz-champ[data-si]', d).forEach(z => { z.hidden = !v[z.dataset.si]; });
      if (vivant) $('.dz-vivant', d).innerHTML = vivant(v) || '';
    };
    const fin = (r) => { d.close(); d.remove(); resolve(r); };
    $('.modal__x', d).onclick = $('.modal__annuler', d).onclick = () => fin(null);
    d.addEventListener('cancel', (e) => { e.preventDefault(); fin(null); });
    d.addEventListener('input', majVue); d.addEventListener('change', majVue);
    const valider = (valeur) => {
      const v = lire();
      for (const c of champs) if (c.requis && (v[c.nom] === '' || v[c.nom] == null)) { const p = $('.modal__err', d); p.textContent = `« ${c.label} » est obligatoire.`; p.hidden = false; return; }
      fin({ action: valeur, ...v });
    };
    $$('[data-valeur]', d).forEach(b => { if (b.type === 'button') b.onclick = () => valider(b.dataset.valeur); });
    $('form', d).addEventListener('submit', (e) => { e.preventDefault(); const b = e.submitter?.dataset.valeur || actions?.at(-1)?.valeur; valider(b); });
    majVue(); d.showModal();
    (d.querySelector('.modal__body input:not([type=checkbox]), .modal__body textarea') || d.querySelector('[type=submit]') || d.querySelector('.modal__annuler')).focus();
  });
}

// Prévenir toutes les vues ouvertes qu'une donnée a changé
const changement = () => window.dispatchEvent(new Event('ecw:maj'));
const pluriel = (n, un, plus) => `${n} ${n > 1 ? plus : un}`;
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const jourMois = (d) => `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
const dateDe = (iso) => new Date(iso + 'T12:00');
const auj = () => isoLocal(new Date()).date;
const dansJours = (iso) => Math.round((dateDe(iso) - dateDe(auj())) / 864e5);
const quandRelatif = (iso) => { const n = dansJours(iso); return n === 0 ? 'aujourd\'hui' : n === 1 ? 'demain' : n > 1 ? `dans ${n} jours` : n === -1 ? 'hier' : `il y a ${-n} jours`; };
const tel = (t) => t ? ` · <a href="tel:${esc(t)}">${esc(t)}</a>` : '';
async function reglage(cle) { const { data } = await sb.from('settings').select('value').eq('key', cle).maybeSingle(); return data?.value ?? null; }

// ── Navigation interne : segments (sous-onglets) ──────────────────────────────
const SEGMENTS = { etuListe: () => Promise.resolve(), etuMois: () => chargerMois(), panelAgenda: () => chargerAgenda(), panelBesoins: () => chargerBesoins(), panelGazette: () => chargerGazette(), panelChiffres: () => chargerChiffres() };
function montrerSegment(id) {
  const cible = document.getElementById(id); if (!cible) return;
  const groupe = cible.closest('.dash__main');
  $$('.segment', groupe).forEach(b => { const on = b.dataset.seg === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
  $$('.seg-panel', groupe).forEach(p => { p.hidden = p.id !== id; });
  SEGMENTS[id]?.().catch(erreur);
}
document.addEventListener('click', (e) => { const b = e.target.closest('.segment'); if (b) montrerSegment(b.dataset.seg); });
window.addEventListener('ecw:segment', (e) => montrerSegment(e.detail));
const segmentVisible = (panel) => $$('.seg-panel', $('#' + panel)).find(p => !p.hidden)?.id;

window.addEventListener('ecw:onglet', (e) => {
  const t = e.detail;
  if (t === 'etudiants') { chargerHeroEtudiants().catch(erreur); if (segmentVisible('panelInscriptions') === 'etuMois') chargerMois().catch(erreur); }
  if (t === 'benevoles') chargerBenevoles().catch(erreur);
  if (t === 'site') SEGMENTS[segmentVisible('panelSite')]?.().catch(erreur);
  if (t === 'reglages') chargerReglages().catch(erreur);
});
window.addEventListener('ecw:maj', () => {
  if (!$('#panelInscriptions').hidden) { chargerHeroEtudiants().catch(() => {}); if (!$('#etuMois').hidden) chargerMois().catch(() => {}); if (typeof loadInscriptions === 'function') loadInscriptions(); }
  if (!$('#panelBenevoles').hidden) chargerBenevoles().catch(() => {});
  if (!$('#panelAgenda').hidden && !$('#panelSite').hidden) chargerAgenda().catch(() => {});
  compterAValider();
});
const entete = (titre, actions = '') => `<div class="dash__heading dash__heading--row"><h1 class="dash__title">${titre}</h1><div class="toolbar__right">${actions}</div></div>`;
const sousTitre = (titre, actions = '') => `<div class="bloc__row"><h2 class="bloc__t">${titre}</h2><div class="toolbar__right">${actions}</div></div>`;

// Badges du menu, dès la connexion
async function compterAValider() {
  const [{ count: aValider }, prochaine] = await Promise.all([
    sb.from('benevole_inscriptions').select('id', { count: 'exact', head: true }).eq('statut', 'confirme'),
    sb.rpc('epicerie_prochaine'),
  ]);
  const b = $('#countAValider'); if (b) { b.textContent = aValider || ''; b.hidden = !aValider; b.title = aValider ? `${aValider} inscription(s) à valider` : ''; }
  const a = $('#countAttente'), n = prochaine.data?.attente || 0;
  if (a) { a.textContent = n || ''; a.hidden = !n; a.title = n ? `${n} en liste d'attente pour la prochaine épicerie` : ''; }
}
sb.auth.onAuthStateChange((ev, session) => { if (session) compterAValider(); });


// ═══════════════════════════════════════════════════════
//  ÉPICERIE ÉTUDIANTE : prochaine date, 12 mois, déplacer, annuler, places
// ═══════════════════════════════════════════════════════
const cleMois = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const premierJeudiDe = (cle) => { const [y, m] = cle.split('-').map(Number); const d1 = new Date(y, m - 1, 1); return new Date(y, m - 1, 1 + (4 - d1.getDay() + 7) % 7); };
const personnes = (liste) => liste.reduce((a, r) => a + (r.nb_personnes || 1), 0);
const ACTIFS_ETU = ['confirmé', 'rappel_envoyé', 'présent', 'liste_attente'];

async function lireEpicerie(cle) {
  const [{ data: ligne }, capReg] = await Promise.all([sb.from('epicerie_mois').select('*').eq('mois', cle).maybeSingle(), reglage('capacite_etudiants')]);
  const pj = premierJeudiDe(cle);
  const jour = ligne?.jour ? dateDe(ligne.jour) : pj;
  const lib = libelleDate(jour);
  const { data: ins } = await sb.from('inscriptions_etudiantes').select('id, prenom, nom, nb_personnes, statut, telephone, email, created_at').eq('date_rdv', lib).in('statut', ACTIFS_ETU).order('created_at');
  const capDefaut = capReg ? Number(capReg) : null;
  return { cle, ligne, jour, iso: isoLocal(jour).date, pj, lib, capDefaut, cap: ligne?.capacite ?? capDefaut, annule: !!ligne?.annule,
    confirmes: (ins || []).filter(i => i.statut !== 'liste_attente'), attente: (ins || []).filter(i => i.statut === 'liste_attente') };
}

function pointsInscritsEtu(E, verbe) {
  const n = E.confirmes.length, a = E.attente.length;
  if (!n && !a) return [{ type: 'ok', html: 'Personne n\'est encore inscrit pour cette date : le changement est simplement visible sur le site.' }];
  const qui = [n ? `<strong>${pluriel(n, 'inscription', 'inscriptions')}</strong> (${pluriel(personnes(E.confirmes), 'personne', 'personnes')})` : '', a ? `<strong>${a} en liste d'attente</strong>` : ''].filter(Boolean).join(' et ');
  return [{ type: verbe === 'annuler' ? 'danger' : 'info', html: `${qui} ${verbe === 'annuler' ? 'seront annulées. Ces personnes ne sont pas pénalisées et pourront s\'inscrire le mois suivant.' : 'sont reportées automatiquement à la nouvelle date : personne ne perd sa place.'}
    <details class="dz-qui"><summary>Voir les personnes</summary><ul>${[...E.confirmes, ...E.attente].map(i => `<li>${esc(i.prenom)} ${esc(i.nom)} · ${i.nb_personnes} pers.${i.statut === 'liste_attente' ? ' · en attente' : ''}${tel(i.telephone)}</li>`).join('')}</ul></details>` }];
}
const champsPrevenir = (n, quoi) => n ? [
  { nom: 'prevenir', label: `Envoyer un e-mail aux ${pluriel(n, 'personne concernée', 'personnes concernées')} ${quoi}`, type: 'checkbox', defaut: true },
  { nom: 'message', label: 'Ajouter un mot de l\'équipe dans l\'e-mail (facultatif)', type: 'textarea', lignes: 2, si: 'prevenir', placeholder: 'ex. Désolé·es pour ce changement, le local est réquisitionné ce jour-là.' },
] : [];

async function choisirDateEpicerie(cle) {
  const E = await lireEpicerie(cle);
  const v = await decision({ titre: `Changer la date de ${MOIS[E.jour.getMonth()]}`, champs: [{ nom: 'jour', label: 'Nouvelle date', type: 'date', requis: true, min: `${cle}-01`, max: isoLocal(new Date(E.jour.getFullYear(), E.jour.getMonth() + 1, 0)).date }],
    valeurs: { jour: E.iso }, points: [{ type: 'info', html: `L'épicerie de ${MOIS[E.jour.getMonth()]} est prévue le <strong>${jourMois(E.jour)}</strong>. Choisissez un autre jour du même mois : l'étape suivante vous montre qui sera prévenu.` }],
    actions: [{ valeur: 'ok', label: 'Continuer' }] });
  if (v) await deplacerEpicerie(cle, v.jour);
}

async function deplacerEpicerie(cle, iso, contexte = []) {
  const E = await lireEpicerie(cle);
  if (iso === E.iso) return;
  const cible = dateDe(iso); const m = MOIS[E.jour.getMonth()];
  const pts = []; let bloque = false;
  if (!iso.startsWith(cle)) { bloque = true; pts.push({ type: 'danger', html: `L'épicerie étudiante a lieu une fois par mois : celle de ${m} peut changer de jour, mais seulement à l'intérieur de ${m}. Pour ne pas l'organiser ce mois-ci, utilisez « Annuler ce mois », puis réglez la date du mois suivant.` }); }
  else if (iso < auj()) { bloque = true; pts.push({ type: 'danger', html: 'Cette date est déjà passée.' }); }
  else if (E.annule) { bloque = true; pts.push({ type: 'danger', html: `L'épicerie de ${m} est annulée. Rétablissez-la d'abord pour pouvoir choisir sa date.` }); }
  if (!bloque) {
    if (cible.getDay() !== 4) pts.push({ type: 'attention', html: `Le ${cible.getDate()} ${m} est un <strong>${JOURS[cible.getDay()]}</strong>. Les étudiant·es ont l'habitude du jeudi : le message ci-dessous s'affiche sur le site à côté de la date, pour éviter toute confusion.` });
    pts.push(...pointsInscritsEtu(E, 'deplacer'));
    const jours = Number(await reglage('jours_inscription_max') || 3);
    const ouv = new Date(cible); ouv.setDate(ouv.getDate() - jours);
    pts.push({ type: 'info', html: isoLocal(ouv).date <= auj() ? `Les inscriptions seront ouvertes tout de suite, puisque la date tombe dans moins de ${jours} jours.` : `Les inscriptions ouvriront le <strong>${jourMois(ouv)}</strong>, ${jours} jours avant, comme d'habitude.` });
    if ((E.confirmes.length || E.attente.length) && dansJours(iso) <= 2) pts.push({ type: 'attention', html: 'C\'est très proche : l\'e-mail risque d\'être lu trop tard. Un SMS ou un appel aux personnes inscrites est plus sûr (numéros dans la liste ci-dessus).' });
    contexte.forEach(c => pts.push({ type: 'info', html: c }));
  }
  const n = E.confirmes.length + E.attente.length;
  const v = await decision({ titre: 'Déplacer l\'épicerie étudiante ?', bloque,
    avant: `<span>Prévue</span><strong>${majusc(jourMois(E.jour))}</strong>`, apres: `<span>Nouvelle date</span><strong>${majusc(jourMois(cible))}</strong>`,
    points: pts, valeurs: { note: cible.getTime() === E.pj.getTime() ? '' : `Exceptionnellement le ${jourMois(cible)}` },
    champs: [{ nom: 'note', label: 'Message affiché sur le site à côté de la date', placeholder: 'ex. Exceptionnellement le 2e jeudi' }, ...champsPrevenir(n, 'avec la nouvelle date et un fichier pour leur agenda')],
    actions: [{ valeur: 'ok', label: 'Déplacer l\'épicerie' }] });
  if (!v) return;
  try {
    const r = await api({ action: 'epicerie_maj', mois: cle, jour: iso, note: v.note, prevenir: v.prevenir !== false, message: v.message || '' });
    toast(`Épicerie déplacée au ${jourMois(cible)}.${r.prevenus ? ` ${pluriel(r.prevenus, 'e-mail envoyé', 'e-mails envoyés')}.` : ''}`); changement();
  } catch (e) { erreur(e); }
}

async function annulerEpicerie(cle) {
  const E = await lireEpicerie(cle); const m = MOIS[E.jour.getMonth()];
  const n = E.confirmes.length + E.attente.length;
  const v = await decision({ titre: `Annuler l'épicerie de ${m} ?`, bloque: E.iso < auj(),
    apres: `<span>N'aura pas lieu</span><strong class="barre">${majusc(jourMois(E.jour))}</strong>`,
    points: E.iso < auj() ? [{ type: 'danger', html: 'Cette date est déjà passée.' }] : [...pointsInscritsEtu(E, 'annuler'), { type: 'info', html: `Sur le site, la page Étudiant·es indique que l'épicerie de ${m} n'a pas lieu et annonce directement la suivante. Vous pourrez la rétablir à tout moment.` }],
    champs: champsPrevenir(n, 'pour les prévenir de l\'annulation'),
    actions: [{ valeur: 'ok', label: `Annuler l'épicerie de ${m}`, style: 'danger' }] });
  if (!v) return;
  try { const r = await api({ action: 'epicerie_maj', mois: cle, annule: true, prevenir: v.prevenir !== false, message: v.message || '' }); toast(`L'épicerie de ${m} est annulée.${r.prevenus ? ` ${pluriel(r.prevenus, 'e-mail envoyé', 'e-mails envoyés')}.` : ''}`); changement(); } catch (e) { erreur(e); }
}

async function retablirEpicerie(cle) {
  const E = await lireEpicerie(cle); const m = MOIS[E.jour.getMonth()];
  const v = await decision({ titre: `Rétablir l'épicerie de ${m} ?`, apres: `<span>Aura lieu</span><strong>${majusc(jourMois(E.jour))}</strong>`,
    points: [{ type: 'info', html: 'La date réapparaît sur le site et les inscriptions rouvrent normalement.' }, { type: 'attention', html: 'Les inscriptions annulées au moment de l\'annulation ne sont pas restaurées : ces personnes doivent se réinscrire.' }],
    actions: [{ valeur: 'ok', label: 'Rétablir' }] });
  if (!v) return;
  try { await api({ action: 'epicerie_maj', mois: cle, annule: false }); toast(`L'épicerie de ${m} est rétablie.`); changement(); } catch (e) { erreur(e); }
}

async function placesEpicerie(cle) {
  const E = await lireEpicerie(cle); const m = MOIS[E.jour.getMonth()];
  const pris = personnes(E.confirmes);
  const v = await decision({ titre: `Nombre de places · ${m}`, valeurs: { capacite: E.ligne?.capacite ?? '' },
    points: [{ type: 'info', html: `Une inscription peut compter plusieurs personnes : c'est le nombre de <strong>personnes</strong> qui est limité. ${pluriel(pris, 'personne est', 'personnes sont')} déjà inscrites. Laissez vide pour appliquer ${E.capDefaut ? `le réglage général (${E.capDefaut} places)` : 'aucune limite'}.` }],
    champs: [{ nom: 'capacite', label: `Places pour le ${jourMois(E.jour)}`, type: 'number', min: 1, max: 500, placeholder: E.capDefaut ? String(E.capDefaut) : 'pas de limite' }],
    vivant: (val) => {
      const cap = val.capacite ?? E.capDefaut;
      if (cap == null) return E.attente.length ? `<p class="dz-note dz-note--ok">Sans limite, les ${E.attente.length} personnes en liste d'attente reçoivent toutes une place et un e-mail de confirmation.</p>` : '';
      if (cap < pris) return `<p class="dz-note dz-note--attention">${pris} personnes sont déjà inscrites, soit plus que ${cap}. Personne n'est retiré : les nouvelles inscriptions passeront simplement en liste d'attente.</p>`;
      let reste = cap - pris, montent = 0; for (const a of E.attente) { if (a.nb_personnes > reste) break; reste -= a.nb_personnes; montent++; }
      return montent ? `<p class="dz-note dz-note--ok">${pluriel(montent, 'inscription de la liste d\'attente reçoit', 'inscriptions de la liste d\'attente reçoivent')} automatiquement une place et un e-mail de confirmation.</p>` : `<p class="dz-note">Il restera ${cap - pris} place${cap - pris > 1 ? 's' : ''} libre${cap - pris > 1 ? 's' : ''}.</p>`;
    },
    actions: [{ valeur: 'ok', label: 'Enregistrer' }] });
  if (!v) return;
  try { const r = await api({ action: 'epicerie_maj', mois: cle, capacite: v.capacite }); toast(`Places enregistrées.${r.promus ? ` ${pluriel(r.promus, 'personne a reçu', 'personnes ont reçu')} une place.` : ''}`); changement(); } catch (e) { erreur(e); }
}

async function chargerHeroEtudiants() {
  const box = $('#etuHero'); if (!box) return;
  const { data: P } = await sb.rpc('epicerie_prochaine');
  if (!P) { box.innerHTML = '<p class="lead-admin">Aucune épicerie étudiante n\'est prévue dans les douze prochains mois : tous les mois sont annulés.</p>'; return; }
  const E = await lireEpicerie(P.mois);
  const pris = personnes(E.confirmes); const jours = Number(await reglage('jours_inscription_max') || 3);
  const pct = E.cap ? Math.min(100, Math.round(pris / E.cap * 100)) : 0;
  const ouverte = P.ouverture <= auj();
  box.innerHTML = `
    <div class="hero-etu__date"><span class="hero-etu__rel">${quandRelatif(P.date)}</span><strong>${majusc(jourMois(dateDe(P.date)))}</strong>${P.note ? `<span class="hero-etu__note">${esc(P.note)}</span>` : ''}</div>
    <div class="hero-etu__corps">
      ${E.cap ? `<div class="jauge-a ${pct >= 100 ? 'is-plein' : ''}"><span style="width:${pct}%"></span></div>` : ''}
      <p class="hero-etu__chiffre"><strong>${pluriel(pris, 'personne inscrite', 'personnes inscrites')}</strong>${E.cap ? ` sur ${E.cap} places${pris >= E.cap ? ', c\'est complet' : `, il en reste ${E.cap - pris}`}` : ', sans limite de places'}.</p>
      ${E.attente.length ? `<p>${pluriel(E.attente.length, 'inscription attend', 'inscriptions attendent')} en liste d'attente : ${E.attente.length > 1 ? 'elles reçoivent' : 'elle reçoit'} une place automatiquement dès qu'une personne se désiste.</p>` : ''}
      <p>${ouverte ? `Les inscriptions sont ouvertes depuis le ${jourMois(dateDe(P.ouverture))}.` : `Les inscriptions ouvriront le ${jourMois(dateDe(P.ouverture))}, ${jours} jours avant.`}${P.mois_annules?.length ? ` Mois annulé${P.mois_annules.length > 1 ? 's' : ''} avant cette date : ${P.mois_annules.map(k => MOIS[Number(k.slice(5)) - 1]).join(', ')}.` : ''}</p>
    </div>
    <div class="hero-etu__a">
      <button class="btn btn--primary" data-h="date">Changer la date</button>
      <button class="btn btn--ghost" data-h="places">Nombre de places</button>
      <button class="btn btn--ghost btn--rouge" data-h="annuler">Annuler ce mois</button>
    </div>`;
  box.onclick = (e) => { const a = e.target.closest('[data-h]')?.dataset.h; if (a === 'date') choisirDateEpicerie(P.mois); if (a === 'places') placesEpicerie(P.mois); if (a === 'annuler') annulerEpicerie(P.mois); };
}
const majusc = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function chargerMois() {
  const box = $('#etuMois');
  const today = new Date(); const cles = [];
  for (let i = 0; i < 12; i++) cles.push(cleMois(new Date(today.getFullYear(), today.getMonth() + i, 1)));
  const [{ data: lignes }, capReg] = await Promise.all([sb.from('epicerie_mois').select('*').in('mois', cles), reglage('capacite_etudiants')]);
  const parMois = Object.fromEntries((lignes || []).map(l => [l.mois, l]));
  const mois = cles.map(cle => { const l = parMois[cle]; const pj = premierJeudiDe(cle); const jour = l?.jour ? dateDe(l.jour) : pj; return { cle, l, jour, pj, lib: libelleDate(jour), passe: isoLocal(jour).date < auj() }; });
  const { data: ins } = await sb.from('inscriptions_etudiantes').select('date_rdv, nb_personnes, statut').in('date_rdv', mois.map(m => m.lib)).in('statut', ACTIFS_ETU);
  box.innerHTML = `<p class="lead-admin">Par défaut, l'épicerie étudiante a lieu le premier jeudi de chaque mois${capReg ? `, avec ${capReg} places (réglage général)` : ''}. Changez la date ou le nombre de places d'un mois en particulier, ou annulez-le : le site, les inscriptions, les e-mails et les rappels suivent.</p>
    <div class="mois-grille">${mois.map(m => {
      const pris = (ins || []).filter(r => r.date_rdv === m.lib && r.statut !== 'liste_attente').reduce((a, r) => a + r.nb_personnes, 0);
      const att = (ins || []).filter(r => r.date_rdv === m.lib && r.statut === 'liste_attente').length;
      const cap = m.l?.capacite ?? (capReg ? Number(capReg) : null);
      const etat = m.l?.annule ? '<span class="pill pill--rouge">Annulée</span>' : m.l?.jour ? '<span class="pill pill--or">Date changée</span>' : '';
      return `<article class="mois ${m.l?.annule ? 'is-annule' : ''} ${m.passe ? 'is-passe' : ''}" data-mois="${m.cle}">
        <div class="mois__h"><h3>${majusc(MOIS[m.jour.getMonth()])} ${m.jour.getFullYear() !== today.getFullYear() ? m.jour.getFullYear() : ''}</h3>${etat}</div>
        <p class="mois__date">${majusc(jourMois(m.jour))}</p>
        ${m.l?.note && !m.l?.annule ? `<p class="mois__note">${esc(m.l.note)}</p>` : ''}
        <p class="mois__places">${m.l?.annule ? 'Pas d\'épicerie ce mois-ci.' : pris || att ? `${pluriel(pris, 'personne inscrite', 'personnes inscrites')}${cap ? ` sur ${cap}` : ''}${att ? `, ${att} en attente` : ''}` : cap ? `${cap} places${m.l?.capacite ? ' (ce mois-ci)' : ''}` : 'Pas de limite de places'}</p>
        ${m.passe ? '' : `<div class="mois__a">${m.l?.annule ? '<button class="btn btn--ghost btn--sm" data-m="retablir">Rétablir</button>' : '<button class="btn btn--ghost btn--sm" data-m="date">Changer la date</button><button class="btn btn--ghost btn--sm" data-m="places">Places</button><button class="btn btn--ghost btn--sm btn--rouge" data-m="annuler">Annuler</button>'}</div>`}
      </article>`; }).join('')}</div>`;
  box.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const cle = b.closest('[data-mois]').dataset.mois;
    ({ date: choisirDateEpicerie, places: placesEpicerie, annuler: annulerEpicerie, retablir: retablirEpicerie })[b.dataset.m](cle); };
}
function libelleDate(d) {
  const j = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][d.getDay()];
  return `${j} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}


// ═══════════════════════════════════════════════════════
//  BÉNÉVOLES : à valider, créneaux, catégories
// ═══════════════════════════════════════════════════════
let BEN = { cats: [], creneaux: [], ins: [], passes: false };
const STATUTS_BEN = { a_confirmer: ['attente', 'E-mail à confirmer'], confirme: ['confirme', 'À valider'], valide: ['present', 'Validé'], refuse: ['absent', 'Refusé'], annule: ['annule', 'Annulé'], expire: ['annule', 'Expiré'] };
const badgeBen = (s) => { const [c, l] = STATUTS_BEN[s] || ['confirme', s]; return `<span class="statut-badge statut-badge--${c}">${l}</span>`; };

async function chargerBenevoles() {
  const depuis = BEN.passes ? new Date(Date.now() - 90 * 864e5) : new Date(Date.now() - 864e5);
  const [{ data: cats, error: e1 }, { data: creneaux, error: e2 }, { data: ins, error: e3 }] = await Promise.all([
    sb.from('benevole_categories').select('*').order('ordre'),
    sb.from('benevole_creneaux').select('*').gte('debut', depuis.toISOString()).order('debut'),
    sb.from('benevole_inscriptions').select('*').order('created_at'),
  ]);
  if (e1 || e2 || e3) throw (e1 || e2 || e3);
  BEN = { ...BEN, cats: cats || [], creneaux: creneaux || [], ins: ins || [] };
  rendreBenevoles();
  compterAValider();
}

function rendreBenevoles() {
  const p = $('#panelBenevoles');
  const cat = (id) => BEN.cats.find(c => c.id === id) || { nom: '?', couleur: 'navy' };
  const crById = Object.fromEntries(BEN.creneaux.map(c => [c.id, c]));
  const aValider = BEN.ins.filter(i => i.statut === 'confirme');
  const avenir = BEN.creneaux.filter(c => new Date(c.debut) > new Date());
  const prises = (c) => BEN.ins.filter(i => i.creneau_id === c.id && (['confirme', 'valide'].includes(i.statut) || (i.statut === 'a_confirmer' && Date.now() - Date.parse(i.created_at) < 48 * 3600e3))).length;
  const libres = avenir.reduce((a, c) => a + Math.max(c.places - prises(c), 0), 0);

  p.innerHTML = entete('Bénévoles', `<a class="btn btn--ghost" href="/benevoles/" target="_blank" rel="noopener">Voir le calendrier public</a><button class="btn btn--ghost" id="btnSerie">Créer une série</button><button class="btn btn--primary" id="btnCreneau">Nouveau créneau</button>`) + `
    <p class="lead-admin">Les bénévoles s'inscrivent sans compte sur le calendrier public, puis confirment leur adresse e-mail. Vous recevez alors une alerte et validez ici leur venue : un e-mail part avec le créneau à ajouter à leur agenda, puis un rappel la veille.</p>
    <div class="stats stats--4">
      <div class="stat ${aValider.length ? 'stat--accent' : ''}"><span class="stat__val">${aValider.length}</span><span class="stat__lbl">à valider</span></div>
      <div class="stat"><span class="stat__val">${avenir.length}</span><span class="stat__lbl">créneaux à venir</span></div>
      <div class="stat"><span class="stat__val">${BEN.ins.filter(i => i.statut === 'valide' && crById[i.creneau_id] && new Date(crById[i.creneau_id].debut) > new Date()).length}</span><span class="stat__lbl">bénévoles attendu·es</span></div>
      <div class="stat"><span class="stat__val">${libres}</span><span class="stat__lbl">places encore libres</span></div>
    </div>

    <section class="bloc">
      <h2 class="bloc__t">À valider ${aValider.length ? `<span class="pill pill--alerte">${aValider.length}</span>` : ''}</h2>
      ${aValider.length ? `<div class="cartes">${aValider.map(i => { const c = crById[i.creneau_id]; return `
        <article class="carte" style="--c:${COULEURS[cat(c?.categorie_id).couleur]}">
          <div class="carte__h"><strong>${esc(i.prenom)} ${esc(i.nom)}</strong><span class="td-muted">confirmé ${fDateHeure(i.confirme_at)}</span></div>
          <p class="carte__cr">${c ? `${esc(cat(c.categorie_id).nom)} · ${fJour(c.debut)}, ${fHeure(c.debut)}–${fHeure(c.fin)}` : 'Créneau passé ou supprimé'}</p>
          <p class="td-contact"><a href="mailto:${esc(i.email)}">${esc(i.email)}</a>${i.telephone ? ` · <a href="tel:${esc(i.telephone)}">${esc(i.telephone)}</a>` : ''}</p>
          ${i.message ? `<p class="carte__msg">« ${esc(i.message)} »</p>` : ''}
          <div class="carte__a"><button class="btn btn--primary btn--sm" data-dec="valide" data-id="${i.id}">Valider</button><button class="btn btn--ghost btn--sm" data-dec="refuse" data-id="${i.id}">Refuser</button></div>
        </article>`; }).join('')}</div>` : '<p class="vide">Personne n\'attend de validation : toutes les inscriptions confirmées ont reçu une réponse.</p>'}
    </section>

    <section class="bloc">
      <div class="bloc__row"><h2 class="bloc__t">${BEN.passes ? 'Créneaux des 90 derniers jours et à venir' : 'Créneaux à venir'}</h2><label class="switch"><input type="checkbox" id="voirPasses" ${BEN.passes ? 'checked' : ''}><span>Afficher les créneaux passés</span></label></div>
      ${BEN.creneaux.length ? BEN.creneaux.map(c => { const k = cat(c.categorie_id); const inscrits = BEN.ins.filter(i => i.creneau_id === c.id && !['annule', 'expire'].includes(i.statut)); const passe = new Date(c.debut) < new Date(); return `
        <article class="creneau ${passe ? 'is-passe' : ''} ${c.publie ? '' : 'is-off'}" style="--c:${COULEURS[k.couleur]}">
          <div class="creneau__quand"><strong>${fJourCourt(c.debut)}</strong><span>${fHeure(c.debut)}–${fHeure(c.fin)}</span></div>
          <div class="creneau__quoi"><strong>${esc(k.nom)}</strong>${c.note ? ` <span class="td-muted">· ${esc(c.note)}</span>` : ''}${c.publie ? '' : ' <span class="pill">non publié</span>'}
            <div class="creneau__gens">${inscrits.length ? inscrits.map(i => `<span class="gens">${esc(i.prenom)} ${esc(i.nom.charAt(0))}. ${badgeBen(i.statut)}${i.presence === 'oui' ? ' <span title="A confirmé sa présence">✓ présent·e</span>' : ''}</span>`).join('') : '<span class="td-muted">Personne pour l\'instant</span>'}</div>
          </div>
          <div class="creneau__places"><strong>${prises(c)}/${c.places}</strong><span>places</span></div>
          <div class="creneau__a"><button class="btn btn--ghost btn--sm" data-cr="${c.id}" data-act="edit">Modifier</button><button class="btn btn--ghost btn--sm" data-cr="${c.id}" data-act="dup">Copier la semaine suivante</button>${passe ? '' : `<button class="btn btn--ghost btn--sm btn--rouge" data-cr="${c.id}" data-act="suppr">Supprimer</button>`}</div>
        </article>`; }).join('') : '<p class="vide">Aucun créneau pour l\'instant. Créez-en un, ou une série d\'un coup (par exemple la distribution chaque premier mardi du mois) : ils apparaissent aussitôt sur le calendrier public.</p>'}
    </section>

    <section class="bloc">
      <div class="bloc__row"><h2 class="bloc__t">Catégories d'activité</h2><button class="btn btn--ghost btn--sm" id="btnCat">Nouvelle catégorie</button></div>
      <p class="lead-admin">Chaque créneau appartient à une catégorie. Sa description s'affiche sur le calendrier public, ses consignes et son lieu partent dans l'e-mail de validation, et sa couleur la distingue dans les agendas.</p>
      <div class="cartes">${BEN.cats.map(k => `
        <article class="carte ${k.actif ? '' : 'is-off'}" style="--c:${COULEURS[k.couleur]}">
          <div class="carte__h"><strong>${esc(k.nom)}</strong>${k.actif ? '' : '<span class="pill">masquée</span>'}</div>
          <p>${esc(k.description) || '<span class="td-muted">Pas de description</span>'}</p>
          ${k.consignes ? `<p class="td-muted">Consignes : ${esc(k.consignes)}</p>` : ''}
          <p class="td-muted">${esc(k.lieu)}</p>
          <div class="carte__a"><button class="btn btn--ghost btn--sm" data-cat="${k.id}">Modifier</button></div>
        </article>`).join('')}</div>
    </section>

    <section class="bloc">
      <div class="bloc__row"><h2 class="bloc__t">Toutes les inscriptions</h2><button class="btn btn--ghost btn--sm" id="exportBen">Exporter CSV</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Bénévole</th><th>Contact</th><th>Créneau</th><th class="text-center">Statut</th><th class="text-center">Présence</th><th>Inscrit le</th><th></th></tr></thead><tbody>
      ${[...BEN.ins].reverse().slice(0, 200).map(i => { const c = crById[i.creneau_id]; return `<tr>
        <td class="td-name">${esc(i.prenom)} ${esc(i.nom)}</td>
        <td class="td-contact"><a href="mailto:${esc(i.email)}">${esc(i.email)}</a>${i.telephone ? `<br><a href="tel:${esc(i.telephone)}">${esc(i.telephone)}</a>` : ''}</td>
        <td class="td-muted">${c ? `${esc(cat(c.categorie_id).nom)}<br>${fJourCourt(c.debut)} ${fHeure(c.debut)}` : '—'}</td>
        <td class="text-center">${badgeBen(i.statut)}</td>
        <td class="text-center">${i.presence === 'oui' ? '✓' : i.presence === 'non' ? '✗' : '—'}</td>
        <td class="td-muted">${fDateHeure(i.created_at)}</td>
        <td>${['confirme', 'valide', 'refuse', 'a_confirmer'].includes(i.statut) && c && new Date(c.debut) > new Date() ? `<button class="btn btn--ghost btn--sm" data-dec="${i.statut === 'valide' ? 'refuse' : 'valide'}" data-id="${i.id}">${i.statut === 'valide' ? 'Retirer' : 'Valider'}</button>` : ''}</td>
      </tr>`; }).join('') || '<tr><td colspan="7" class="vide">Aucune inscription.</td></tr>'}
      </tbody></table></div>
    </section>`;

  $('#voirPasses').onchange = (e) => { BEN.passes = e.target.checked; chargerBenevoles().catch(erreur); };
  $('#btnCreneau').onclick = () => editerCreneau();
  $('#btnSerie').onclick = () => creerSerie();
  $('#btnCat').onclick = () => editerCategorie();
  $('#exportBen').onclick = exporterBenevoles;
  $$('[data-cat]', p).forEach(b => b.onclick = () => editerCategorie(BEN.cats.find(k => k.id === b.dataset.cat)));
  $$('[data-cr]', p).forEach(b => b.onclick = () => { const c = BEN.creneaux.find(x => x.id === b.dataset.cr); ({ dup: dupliquer, suppr: supprimerCreneau, edit: editerCreneau })[b.dataset.act](c); });
  $$('[data-dec]', p).forEach(b => b.onclick = () => decider(b.dataset.id, b.dataset.dec));
}

async function decider(id, decision) {
  const i = BEN.ins.find(x => x.id === id) || (await sb.from('benevole_inscriptions').select('*').eq('id', id).single()).data;
  const v = await formulaire({
    titre: decision === 'valide' ? `Valider ${i.prenom} ${i.nom}` : `${i.statut === 'valide' ? 'Retirer' : 'Refuser'} ${i.prenom} ${i.nom}`,
    aide: decision === 'valide' ? 'Un e-mail de validation part avec le créneau à ajouter à l\'agenda et un lien pour se désister.' : 'Un e-mail poli part pour prévenir la personne et l\'inviter à choisir un autre créneau.',
    champs: [{ nom: 'note', label: 'Petit mot ajouté à l\'e-mail (facultatif)', type: 'textarea', lignes: 2 }],
    valider: decision === 'valide' ? 'Valider et envoyer l\'e-mail' : 'Confirmer et envoyer l\'e-mail',
  });
  if (!v) return;
  try { await api({ action: 'benevole_decision', id, decision, note: v.note }); toast(decision === 'valide' ? `${i.prenom} est validé·e, l'e-mail est parti.` : `L'e-mail est parti à ${i.prenom}.`); changement(); } catch (e) { erreur(e); }
}

const champsCreneau = () => [
  { nom: 'categorie_id', label: 'Activité', type: 'select', requis: true, options: BEN.cats.filter(k => k.actif).map(k => [k.id, k.nom]) },
  { nom: 'date', label: 'Date', type: 'date', requis: true, demi: true },
  { nom: 'places', label: 'Nombre de bénévoles', type: 'number', min: 1, max: 200, defaut: 2, requis: true, demi: true },
  { nom: 'debut', label: 'Début', type: 'time', requis: true, demi: true, defaut: '09:00' },
  { nom: 'fin', label: 'Fin', type: 'time', requis: true, demi: true, defaut: '12:00' },
  { nom: 'note', label: 'Précision affichée sur le calendrier public (facultatif)', placeholder: 'ex. Spécial rentrée scolaire' },
  { nom: 'publie', label: 'Visible dans le calendrier public', type: 'checkbox', defaut: true },
];
const versIso = (date, heure) => new Date(`${date}T${heure}`).toISOString();

const STATUT_LONG = { a_confirmer: 'n\'a pas encore confirmé son e-mail', confirme: 'attend votre validation', valide: 'validé·e' };
const catDe = (id) => BEN.cats.find(k => k.id === id) || { nom: 'Créneau', couleur: 'navy' };
async function assurerCats() { if (!BEN.cats.length) BEN.cats = (await sb.from('benevole_categories').select('*').order('ordre')).data || []; }
async function inscritsCreneau(id) { return (await sb.from('benevole_inscriptions').select('*').eq('creneau_id', id).in('statut', ['a_confirmer', 'confirme', 'valide']).order('created_at')).data || []; }
const horaire = (debut, fin) => `${majusc(jourMois(new Date(debut)))}, ${fHeure(debut)} – ${fHeure(fin)}`;

// Points communs à toute modification de date d'un créneau
async function pointsChangementCreneau(c, debut, fin, ins, contexte = []) {
  const pts = []; let bloque = false;
  if (Date.parse(debut) < Date.now()) { bloque = true; pts.push({ type: 'danger', html: 'Cette date est déjà passée.' }); return { pts, bloque }; }
  pts.push(ins.length
    ? { type: 'info', html: `<strong>${pluriel(ins.length, 'bénévole est inscrit·e', 'bénévoles sont inscrit·es')}</strong> et ${ins.length > 1 ? 'gardent leur place' : 'garde sa place'} sur la nouvelle date. Le rappel de la veille partira pour la nouvelle date.<ul class="dz-gens">${ins.map(i => `<li>${esc(i.prenom)} ${esc(i.nom)} · ${STATUT_LONG[i.statut]}${tel(i.telephone)}</li>`).join('')}</ul>` }
    : { type: 'ok', html: 'Personne n\'est encore inscrit sur ce créneau : le changement est simplement visible sur le calendrier public.' });
  if (ins.length && Date.parse(debut) - Date.now() < 48 * 3600e3) pts.push({ type: 'attention', html: 'La nouvelle date est dans moins de 48 heures : l\'e-mail risque d\'être lu trop tard. Un appel ou un SMS est plus sûr.' });
  const jour = isoLocal(debut).date;
  const { data: memes } = await sb.from('benevole_creneaux').select('id, debut, fin').eq('categorie_id', c.categorie_id).gte('debut', versIso(jour, '00:00')).lte('debut', versIso(jour, '23:59')).neq('id', c.id || '00000000-0000-0000-0000-000000000000');
  (memes || []).forEach(m => pts.push({ type: 'attention', html: `Il existe déjà un créneau « ${esc(catDe(c.categorie_id).nom)} » ce jour-là, de ${fHeure(m.debut)} à ${fHeure(m.fin)}. Vérifiez qu'il ne s'agit pas d'un doublon.` }));
  contexte.forEach(t => pts.push({ type: 'info', html: t }));
  return { pts, bloque };
}

async function deplacerCreneau(c, iso, contexte = []) {
  await assurerCats();
  const h1 = isoLocal(c.debut).heure, h2 = isoLocal(c.fin).heure;
  const debut = versIso(iso, h1), fin = versIso(iso, h2);
  if (isoLocal(c.debut).date === iso) return;
  const ins = await inscritsCreneau(c.id);
  const { pts, bloque } = await pointsChangementCreneau(c, debut, fin, ins, contexte);
  const k = catDe(c.categorie_id);
  const v = await decision({ titre: `Déplacer « ${k.nom} » ?`, bloque, points: pts,
    avant: `<span>Prévu</span><strong>${horaire(c.debut, c.fin)}</strong>`, apres: `<span>Nouvelle date</span><strong>${horaire(debut, fin)}</strong>`,
    champs: champsPrevenir(ins.length, 'avec la nouvelle date'),
    actions: [{ valeur: 'copie', label: 'Plutôt créer une copie ce jour-là', style: 'ghost' }, { valeur: 'deplacer', label: 'Déplacer le créneau' }] });
  if (!v) return;
  try {
    if (v.action === 'copie') { await copierCreneau(c, iso); toast(`Copie créée le ${jourMois(dateDe(iso))}, sans inscrit·es.`); }
    else { const r = await api({ action: 'creneau_maj', id: c.id, debut, fin, prevenir: v.prevenir !== false, message: v.message || '' }); toast(`Créneau déplacé au ${jourMois(dateDe(iso))}.${r.prevenus ? ` ${pluriel(r.prevenus, 'bénévole prévenu·e', 'bénévoles prévenu·es')} par e-mail.` : ''}`); }
    changement();
  } catch (e) { erreur(e); }
}

async function copierCreneau(c, iso) {
  const { error } = await sb.from('benevole_creneaux').insert({ categorie_id: c.categorie_id, debut: versIso(iso, isoLocal(c.debut).heure), fin: versIso(iso, isoLocal(c.fin).heure), places: c.places, note: c.note, publie: c.publie });
  if (error) throw error;
}

async function supprimerCreneau(c) {
  await assurerCats();
  const ins = await inscritsCreneau(c.id); const passe = Date.parse(c.debut) < Date.now();
  const v = await decision({ titre: `Supprimer « ${catDe(c.categorie_id).nom} » ?`,
    apres: `<span>Sera supprimé</span><strong class="barre">${horaire(c.debut, c.fin)}</strong>`,
    points: ins.length && !passe
      ? [{ type: 'danger', html: `<strong>${pluriel(ins.length, 'bénévole perd', 'bénévoles perdent')} sa place</strong> :<ul class="dz-gens">${ins.map(i => `<li>${esc(i.prenom)} ${esc(i.nom)} · ${STATUT_LONG[i.statut]}${tel(i.telephone)}</li>`).join('')}</ul>` }, { type: 'info', html: 'Si le créneau change seulement de jour, déplacez-le plutôt (glissez-le dans l\'agenda) : les bénévoles gardent leur place.' }]
      : [{ type: 'info', html: passe ? 'Ce créneau est passé : il disparaît de l\'historique, ainsi que la liste des personnes présentes.' : 'Personne n\'est inscrit : le créneau disparaît simplement du calendrier public.' }],
    champs: passe ? [] : champsPrevenir(ins.length, 'pour leur dire que le créneau est annulé'),
    actions: [{ valeur: 'ok', label: 'Supprimer le créneau', style: 'danger' }] });
  if (!v) return;
  try { const r = await api({ action: 'creneau_supprimer', id: c.id, prevenir: v.prevenir !== false, message: v.message || '' }); toast(`Créneau supprimé.${r.prevenus ? ` ${pluriel(r.prevenus, 'bénévole prévenu·e', 'bénévoles prévenu·es')}.` : ''}`); changement(); } catch (e) { erreur(e); }
}

async function editerCreneau(c, valeursInitiales = {}) {
  await assurerCats();
  const val = c ? { ...c, date: isoLocal(c.debut).date, debut: isoLocal(c.debut).heure, fin: isoLocal(c.fin).heure } : valeursInitiales;
  const v = await formulaire({ titre: c ? `Modifier « ${catDe(c.categorie_id).nom} »` : 'Nouveau créneau', champs: champsCreneau(), valeurs: val, supprimer: !!c,
    aide: c ? '' : 'Le créneau apparaît tout de suite sur le calendrier public (sauf si vous décochez « Visible »). Pour plusieurs dates identiques, utilisez plutôt « Créer une série ».' });
  if (!v) return;
  if (v.__supprimer) return supprimerCreneau(c);
  if (v.fin <= v.debut) return toast('L\'heure de fin doit être après l\'heure de début.', false);
  const row = { categorie_id: v.categorie_id, debut: versIso(v.date, v.debut), fin: versIso(v.date, v.fin), places: v.places, note: v.note, publie: v.publie };
  try {
    if (!c) { const { error } = await sb.from('benevole_creneaux').insert(row); if (error) throw error; toast('Créneau créé.'); return changement(); }
    const ins = await inscritsCreneau(c.id);
    const deplace = Date.parse(row.debut) !== Date.parse(c.debut) || Date.parse(row.fin) !== Date.parse(c.fin);
    let prevenir = false, message = '';
    if (deplace || row.places < ins.length || (!row.publie && c.publie && ins.length)) {
      const pts = deplace ? (await pointsChangementCreneau({ ...c, ...row }, row.debut, row.fin, ins)).pts : [];
      if (row.places < ins.length) pts.push({ type: 'attention', html: `${ins.length} bénévoles sont déjà inscrit·es pour ${row.places} place${row.places > 1 ? 's' : ''}. Personne n'est retiré automatiquement : le créneau s'affichera complet.` });
      if (!row.publie && c.publie && ins.length) pts.push({ type: 'info', html: 'Le créneau disparaît du calendrier public, mais les bénévoles déjà inscrit·es restent attendu·es.' });
      const r = await decision({ titre: 'Enregistrer ces changements ?', points: pts, bloque: deplace && Date.parse(row.debut) < Date.now(),
        avant: deplace ? `<span>Avant</span><strong>${horaire(c.debut, c.fin)}</strong>` : '', apres: deplace ? `<span>Après</span><strong>${horaire(row.debut, row.fin)}</strong>` : '',
        champs: deplace ? champsPrevenir(ins.length, 'avec le nouvel horaire') : [], actions: [{ valeur: 'ok', label: 'Enregistrer' }] });
      if (!r) return;
      prevenir = r.prevenir !== false; message = r.message || '';
    }
    const r = await api({ action: 'creneau_maj', id: c.id, ...row, prevenir, message });
    toast(`Créneau enregistré.${r.prevenus ? ` ${pluriel(r.prevenus, 'bénévole prévenu·e', 'bénévoles prévenu·es')}.` : ''}`); changement();
  } catch (e) { erreur(e); }
}

async function dupliquer(c) {
  const d = new Date(c.debut); d.setDate(d.getDate() + 7);
  try { await copierCreneau(c, isoLocal(d).date); toast(`Copié au ${jourMois(d)}.`); changement(); } catch (e) { erreur(e); }
}

async function creerSerie(valeursInitiales = {}) {
  await assurerCats();
  const v = await formulaire({ titre: 'Créer une série de créneaux', valeurs: valeursInitiales, aide: 'Crée d\'un coup plusieurs créneaux identiques, par exemple la distribution chaque premier mardi du mois ou le potager chaque samedi. Vous pourrez ensuite modifier ou déplacer chacun séparément.',
    champs: [...champsCreneau().map(c => c.nom === 'date' ? { ...c, label: 'Première date' } : c),
      { nom: 'rythme', label: 'Répétition', type: 'select', options: [['semaine', 'Chaque semaine'], ['quinzaine', 'Toutes les deux semaines'], ['mois', 'Chaque mois, même jour de la semaine (ex. 1er mardi)']] },
      { nom: 'nombre', label: 'Nombre de créneaux', type: 'number', min: 2, max: 52, defaut: 6, requis: true }] });
  if (!v) return;
  if (v.fin <= v.debut) return toast('L\'heure de fin doit être après le début.', false);
  const d0 = new Date(v.date + 'T12:00'); const rangSemaine = Math.ceil(d0.getDate() / 7);
  const dates = [];
  for (let k = 0; k < v.nombre; k++) {
    let d;
    if (v.rythme === 'mois') {
      const m = new Date(d0.getFullYear(), d0.getMonth() + k, 1);
      d = new Date(m.getFullYear(), m.getMonth(), 1 + (d0.getDay() - m.getDay() + 7) % 7 + (rangSemaine - 1) * 7);
      if (d.getMonth() !== m.getMonth()) continue;
    } else d = new Date(d0.getTime() + k * (v.rythme === 'quinzaine' ? 14 : 7) * 864e5);
    dates.push(isoLocal(d).date);
  }
  const rows = dates.map(date => ({ categorie_id: v.categorie_id, debut: versIso(date, v.debut), fin: versIso(date, v.fin), places: v.places, note: v.note, publie: v.publie }));
  const { error } = await sb.from('benevole_creneaux').insert(rows);
  error ? erreur(error) : (toast(`${rows.length} créneaux créés, du ${jourMois(dateDe(dates[0]))} au ${jourMois(dateDe(dates.at(-1)))}.`), changement());
}

async function editerCategorie(k) {
  const v = await formulaire({ titre: k ? `Modifier « ${k.nom} »` : 'Nouvelle catégorie', valeurs: k || {},
    champs: [
      { nom: 'nom', label: 'Nom', requis: true, placeholder: 'ex. Distribution des colis' },
      { nom: 'description', label: 'Description (ce que fait le ou la bénévole)', type: 'textarea' },
      { nom: 'consignes', label: 'Consignes pratiques (envoyées à la validation)', type: 'textarea', lignes: 2 },
      { nom: 'lieu', label: 'Lieu', defaut: 'Épicerie sociale, rue de la Station 139A, 1410 Waterloo' },
      { nom: 'couleur', label: 'Couleur dans le calendrier', type: 'select', options: Object.entries(NOMS_COULEURS) },
      { nom: 'ordre', label: 'Ordre d\'affichage', type: 'number', min: 0, defaut: BEN.cats.length + 1, demi: true },
      { nom: 'actif', label: 'Visible sur le site', type: 'checkbox', defaut: true },
    ],
    supprimer: !!k });
  if (!v) return;
  if (v.__supprimer && !(await decision({ titre: `Supprimer « ${k.nom} » ?`, points: [{ type: 'attention', html: 'Une catégorie utilisée par des créneaux (même passés) ne peut pas être supprimée. Pour la retirer du site sans rien perdre, décochez plutôt « Visible sur le site ».' }], actions: [{ valeur: 'ok', label: 'Supprimer', style: 'danger' }] }))) return;
  if (v.__supprimer) { const { error } = await sb.from('benevole_categories').delete().eq('id', k.id); return error ? toast('Des créneaux utilisent cette catégorie : décochez plutôt « Visible sur le site ».', false) : (toast('Catégorie supprimée.'), changement()); }
  const { error } = k ? await sb.from('benevole_categories').update(v).eq('id', k.id) : await sb.from('benevole_categories').insert(v);
  error ? erreur(error) : (toast('Catégorie enregistrée.'), changement());
}

function exporterBenevoles() {
  const cr = Object.fromEntries(BEN.creneaux.map(c => [c.id, c])); const cat = Object.fromEntries(BEN.cats.map(k => [k.id, k.nom]));
  telechargerCsv('benevoles-ecw.csv', ['Prénom', 'Nom', 'E-mail', 'Téléphone', 'Catégorie', 'Créneau', 'Statut', 'Présence', 'Message'],
    BEN.ins.map(i => { const c = cr[i.creneau_id]; return [i.prenom, i.nom, i.email, i.telephone, c ? cat[c.categorie_id] : '', c ? `${fJourCourt(c.debut)} ${fHeure(c.debut)}` : '', STATUTS_BEN[i.statut]?.[1] || i.statut, i.presence || '', i.message]; }));
}
function telechargerCsv(nom, entetes, lignes) {
  const csv = [entetes, ...lignes].map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = nom; a.click(); URL.revokeObjectURL(a.href);
}


// ═══════════════════════════════════════════════════════
//  AGENDA & ACTUS
// ═══════════════════════════════════════════════════════
async function chargerAgenda() {
  const { data, error } = await sb.from('actus').select('*').order('date_evenement', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false });
  if (error) throw error;
  const p = $('#panelAgenda');
  const aujourdhui = isoLocal(new Date()).date;
  p.innerHTML = sousTitre('Agenda &amp; nouvelles', '<a class="btn btn--ghost" href="/agenda/" target="_blank" rel="noopener">Voir la page Agenda</a><button class="btn btn--primary" id="btnActu">Ajouter</button>') + `
    <p class="lead-admin">Un événement daté (fête, collecte, spectacle…) s'affiche sur l'accueil, parmi les trois prochains, et sur la page Agenda jusqu'à sa date. Sans date, c'est une nouvelle : elle reste dans « Les dernières nouvelles » de la page Agenda. Les événements apparaissent aussi dans l'agenda du tableau de bord, où vous pouvez les glisser d'un jour à l'autre.</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Titre</th><th>Lieu</th><th class="text-center">Visible</th><th></th></tr></thead><tbody>
    ${(data || []).map(a => `<tr class="${a.date_evenement && a.date_evenement < aujourdhui ? 'is-passe' : ''}">
      <td class="td-muted" style="white-space:nowrap">${a.date_evenement ? fJourCourt(a.date_evenement + 'T12:00') + (a.heure ? ` · ${esc(a.heure)}` : '') : 'Nouvelle'}</td>
      <td class="td-name">${esc(a.titre)}</td><td class="td-muted">${esc(a.lieu)}</td>
      <td class="text-center">${a.publie ? '✓' : '—'}</td>
      <td class="text-right"><button class="btn btn--ghost btn--sm" data-id="${a.id}">Modifier</button></td></tr>`).join('') || '<tr><td colspan="5" class="vide">Aucun événement ni nouvelle. Le bloc « À venir » de l\'accueil reste masqué tant qu\'il n\'y a rien à annoncer.</td></tr>'}
    </tbody></table></div>`;
  $('#btnActu').onclick = () => editerActu();
  $$('[data-id]', p).forEach(b => b.onclick = () => editerActu(data.find(a => a.id === b.dataset.id)));
}
async function editerActu(a, valeursInitiales = {}) {
  const v = await formulaire({ titre: a ? `Modifier « ${a.titre} »` : 'Nouvel événement ou nouvelle', valeurs: a || valeursInitiales, supprimer: !!a,
    champs: [
      { nom: 'titre', label: 'Titre', requis: true, placeholder: 'ex. La Magie de Noël' },
      { nom: 'date_evenement', label: 'Date (vide = simple nouvelle)', type: 'date', demi: true },
      { nom: 'heure', label: 'Heure', demi: true, placeholder: 'ex. 14h – 17h' },
      { nom: 'lieu', label: 'Lieu', placeholder: 'ex. Épicerie sociale' },
      { nom: 'texte', label: 'Texte', type: 'textarea', lignes: 4 },
      { nom: 'lien_url', label: 'Lien (facultatif)', type: 'url', placeholder: 'https://… ou /aider/#lutins', demi: true },
      { nom: 'lien_label', label: 'Texte du lien', demi: true, placeholder: 'ex. Devenir lutin·e' },
      { nom: 'publie', label: 'Visible sur le site', type: 'checkbox', defaut: true },
    ] });
  if (!v) return;
  if (v.__supprimer) return supprimerActu(a);
  v.date_evenement = v.date_evenement || null;
  const { error } = a ? await sb.from('actus').update(v).eq('id', a.id) : await sb.from('actus').insert(v);
  error ? erreur(error) : (toast(v.date_evenement ? `« ${v.titre} » est annoncé au ${jourMois(dateDe(v.date_evenement))}.` : `« ${v.titre} » est publié dans les nouvelles.`), changement());
}
async function supprimerActu(a) {
  const ok = await decision({ titre: `Supprimer « ${a.titre} » ?`, points: [{ type: 'info', html: `${a.publie ? 'Il disparaît de l\'accueil et de la page Agenda.' : 'Il n\'était pas visible sur le site.'} Pour le cacher sans le perdre, décochez plutôt « Visible sur le site ».` }], actions: [{ valeur: 'ok', label: 'Supprimer', style: 'danger' }] });
  if (!ok) return;
  const { error } = await sb.from('actus').delete().eq('id', a.id);
  error ? erreur(error) : (toast('Supprimé.'), changement());
}
async function deplacerActu(a, iso, contexte = []) {
  if (a.date_evenement === iso) return;
  const passe = iso < auj();
  const v = await decision({ titre: `Déplacer « ${a.titre} » ?`, avant: `<span>Prévu</span><strong>${majusc(jourMois(dateDe(a.date_evenement)))}</strong>`, apres: `<span>Nouvelle date</span><strong>${majusc(jourMois(dateDe(iso)))}</strong>`,
    points: [passe ? { type: 'attention', html: 'Cette date est passée : l\'événement ira directement dans « Déjà passés » sur la page Agenda.' } : { type: 'info', html: `${a.publie ? 'L\'accueil et la page Agenda affichent la nouvelle date dès maintenant.' : 'Cet événement n\'est pas visible sur le site.'} Aucun e-mail n'est envoyé : les événements ne prennent pas d'inscriptions.` }, ...contexte.map(t => ({ type: 'info', html: t }))],
    actions: [{ valeur: 'copie', label: 'Plutôt dupliquer ce jour-là', style: 'ghost' }, { valeur: 'ok', label: 'Déplacer' }] });
  if (!v) return;
  const { id, created_at, ...reste } = a;
  const { error } = v.action === 'copie' ? await sb.from('actus').insert({ ...reste, date_evenement: iso }) : await sb.from('actus').update({ date_evenement: iso }).eq('id', id);
  error ? erreur(error) : (toast(v.action === 'copie' ? 'Événement dupliqué.' : `Déplacé au ${jourMois(dateDe(iso))}.`), changement());
}


// ═══════════════════════════════════════════════════════
//  BESOINS DU MOMENT
// ═══════════════════════════════════════════════════════
async function chargerBesoins() {
  const { data, error } = await sb.from('besoins').select('*').order('ordre').order('created_at');
  if (error) throw error;
  const p = $('#panelBesoins');
  p.innerHTML = sousTitre('Besoins du moment', '<a class="btn btn--ghost" href="/aider/#besoins" target="_blank" rel="noopener">Voir sur la page Aider</a>') + `
    <p class="lead-admin">Cette liste s'affiche sur la page « Aider », sous « Plutôt un don en nature ? », avec un bouton pour la partager. Marquez « urgent » ce qui manque vraiment : ces lignes passent en premier, en couleur. Décochez « Affiché » pour cacher une ligne sans la perdre, et pensez à retirer ce qui est de nouveau en stock.</p>
    <form class="ajout" id="ajoutBesoin"><input class="input" name="libelle" placeholder="ex. Couches taille 4" required><input class="input" name="detail" placeholder="Précision (facultatif)"><label class="switch"><input type="checkbox" name="urgent"><span>Urgent</span></label><button class="btn btn--primary">Ajouter</button></form>
    <ul class="liste-besoins">${(data || []).map((b, i) => `<li class="${b.actif ? '' : 'is-off'}" data-id="${b.id}">
      <div class="lb__ordre"><button class="btn btn--ghost btn--sm" data-act="haut" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button><button class="btn btn--ghost btn--sm" data-act="bas" ${i === data.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button></div>
      <div class="lb__txt"><strong>${esc(b.libelle)}</strong>${b.detail ? ` <span class="td-muted">${esc(b.detail)}</span>` : ''}</div>
      <label class="switch"><input type="checkbox" data-act="urgent" ${b.urgent ? 'checked' : ''}><span>Urgent</span></label>
      <label class="switch"><input type="checkbox" data-act="actif" ${b.actif ? 'checked' : ''}><span>Affiché</span></label>
      <button class="btn btn--ghost btn--sm" data-act="suppr">Supprimer</button></li>`).join('') || '<li class="vide">La liste est vide : la section ne s\'affiche pas sur le site.</li>'}</ul>`;
  $('#ajoutBesoin').onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await sb.from('besoins').insert({ libelle: f.get('libelle').trim(), detail: (f.get('detail') || '').trim(), urgent: !!f.get('urgent'), ordre: (data?.length || 0) + 1 });
    error ? erreur(error) : chargerBesoins();
  };
  $$('li[data-id]', p).forEach(li => li.addEventListener('click', async (e) => {
    const act = e.target.dataset.act; if (!act || e.target.type === 'checkbox' && e.type !== 'click') return;
    const id = li.dataset.id, i = data.findIndex(b => b.id === id);
    let r;
    if (act === 'urgent' || act === 'actif') r = await sb.from('besoins').update({ [act]: e.target.checked }).eq('id', id);
    if (act === 'suppr') { if (!(await decision({ titre: `Retirer « ${data[i].libelle} » ?`, points: [{ type: 'info', html: 'La ligne disparaît de la page Aider. Pour la cacher le temps d\'un réassort, décochez plutôt « Affiché ».' }], actions: [{ valeur: 'ok', label: 'Retirer', style: 'danger' }] }))) return; r = await sb.from('besoins').delete().eq('id', id); }
    if (act === 'haut' || act === 'bas') {
      const j = act === 'haut' ? i - 1 : i + 1; const ordre = data.map((b, k) => b.id);
      [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
      r = await sb.from('besoins').upsert(ordre.map((bid, k) => ({ ...data.find(b => b.id === bid), ordre: k + 1 })));
    }
    if (r?.error) return erreur(r.error);
    chargerBesoins();
  }));
}


// ═══════════════════════════════════════════════════════
//  GAZETTE : numéros, envoi aux abonné·es
// ═══════════════════════════════════════════════════════
async function chargerGazette() {
  const [{ data: gz, error }, { data: ab }] = await Promise.all([
    sb.from('gazettes').select('*').order('numero', { ascending: false }),
    sb.from('abonnes_gazette').select('*').order('created_at', { ascending: false }),
  ]);
  if (error) throw error;
  const actifs = (ab || []).filter(a => a.statut === 'actif');
  const p = $('#panelGazette');
  p.innerHTML = sousTitre('La Gazette conviviale', '<button class="btn btn--primary" id="btnGazette">Mettre en ligne un numéro</button>') + `
    <div class="stats"><div class="stat"><span class="stat__val">${gz.length}</span><span class="stat__lbl">numéros en ligne</span></div><div class="stat"><span class="stat__val">${actifs.length}</span><span class="stat__lbl">abonné·es</span></div><div class="stat"><span class="stat__val">${(ab || []).filter(a => a.statut === 'a_confirmer').length}</span><span class="stat__lbl">en attente de confirmation</span></div></div>
    <p class="lead-admin">Les deux derniers numéros s'affichent sur la page « Qui sommes-nous ? », avec la liseuse ; les plus anciens passent dans les archives. Une fois le numéro en ligne, le bouton « Envoyer » l'adresse par e-mail aux abonné·es, une seule fois. Les abonné·es s'inscrivent depuis le site et confirment leur adresse : personne ne reçoit la Gazette sans l'avoir demandée.</p>
    <div class="cartes cartes--gz">${gz.map(g => `<article class="carte carte--gz ${g.publie ? '' : 'is-off'}">
      <img src="${esc(g.cover_url)}" alt="" loading="lazy">
      <div><div class="carte__h"><strong>N°${g.numero} · ${esc(g.titre)}</strong>${g.publie ? '' : '<span class="pill">masqué</span>'}</div>
      <p class="td-muted">${g.envoyee_at ? `Envoyé le ${fDateHeure(g.envoyee_at)}${g.envoyee_nb != null ? ` à ${g.envoyee_nb} abonné·es` : ''}` : 'Pas encore envoyé aux abonné·es'}</p>
      <div class="carte__a"><a class="btn btn--ghost btn--sm" href="${esc(g.pdf_url)}" target="_blank" rel="noopener">PDF ↗</a><button class="btn btn--ghost btn--sm" data-edit="${g.id}">Modifier</button>${g.envoyee_at ? '' : `<button class="btn btn--primary btn--sm" data-send="${g.id}">Envoyer aux ${actifs.length} abonné·es</button>`}</div></div>
    </article>`).join('')}</div>
    <section class="bloc"><div class="bloc__row"><h2 class="bloc__t">Abonné·es</h2><button class="btn btn--ghost btn--sm" id="exportAb">Exporter en CSV</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>E-mail</th><th class="text-center">Statut</th><th>Inscrit·e le</th></tr></thead><tbody>
      ${(ab || []).map(a => `<tr><td>${esc(a.email)}</td><td class="text-center">${{ actif: '<span class="statut-badge statut-badge--present">Abonné·e</span>', a_confirmer: '<span class="statut-badge statut-badge--attente">À confirmer</span>', desabonne: '<span class="statut-badge statut-badge--annule">Désabonné·e</span>' }[a.statut]}</td><td class="td-muted">${fDateHeure(a.created_at)}</td></tr>`).join('') || '<tr><td colspan="3" class="vide">Personne pour l\'instant. Le formulaire d\'abonnement se trouve sous la Gazette, sur la page « Qui sommes-nous ? ».</td></tr>'}
      </tbody></table></div></section>`;
  $('#btnGazette').onclick = () => editerGazette(null, gz);
  $$('[data-edit]', p).forEach(b => b.onclick = () => editerGazette(gz.find(g => g.id === b.dataset.edit), gz));
  $$('[data-send]', p).forEach(b => b.onclick = async () => {
    const g = gz.find(x => x.id === b.dataset.send);
    const ok = await decision({ titre: `Envoyer la Gazette N°${g.numero} ?`, apres: `<span>Destinataires</span><strong>${pluriel(actifs.length, 'abonné·e', 'abonné·es')}</strong>`,
      points: [{ type: 'mail', html: `Chaque personne reçoit un e-mail avec la couverture du N°${g.numero} (${esc(g.titre)}), un bouton pour le lire en ligne et un lien de désinscription.` }, { type: 'attention', html: 'L\'envoi ne se fait qu\'une fois : vérifiez d\'abord que le PDF est le bon (bouton « PDF »).' }, ...(g.publie ? [] : [{ type: 'danger', html: 'Ce numéro est masqué sur le site : rendez-le visible avant de l\'envoyer.' }])],
      bloque: !g.publie || !actifs.length, actions: [{ valeur: 'ok', label: `Envoyer à ${pluriel(actifs.length, 'abonné·e', 'abonné·es')}` }] });
    if (!ok) return;
    b.disabled = true; b.textContent = 'Envoi…';
    try { const r = await api({ action: 'gazette_envoyer', gazette_id: g.id }); toast(`Envoyée à ${r.envoyes} abonné·es.`); chargerGazette(); } catch (e) { erreur(e); b.disabled = false; }
  });
  $('#exportAb').onclick = () => telechargerCsv('abonnes-gazette.csv', ['E-mail', 'Statut', 'Inscription'], (ab || []).map(a => [a.email, a.statut, a.created_at]));
}

async function editerGazette(g, toutes) {
  const v = await formulaire({ titre: g ? `Modifier le N°${g.numero}` : 'Nouveau numéro', valeurs: g || { numero: (toutes[0]?.numero || 0) + 1 },
    aide: g ? 'Laissez les fichiers vides pour garder les actuels.' : 'Le PDF et la couverture (image JPG ou PNG, environ 900 px de large) sont mis en ligne directement.',
    champs: [
      { nom: 'numero', label: 'Numéro', type: 'number', min: 1, requis: true, demi: true },
      { nom: 'titre', label: 'Période', requis: true, demi: true, placeholder: 'ex. Décembre 2026' },
      { nom: 'pdf', label: 'Fichier PDF', type: 'file', accept: 'application/pdf', requis: !g },
      { nom: 'cover', label: 'Couverture (image)', type: 'file', accept: 'image/jpeg,image/png,image/webp', requis: !g },
      { nom: 'publie', label: 'Visible sur le site', type: 'checkbox', defaut: true },
    ], valider: 'Mettre en ligne', supprimer: g ? 'Retirer ce numéro du site ? (Les fichiers restent stockés.)' : null });
  if (!v) return;
  if (v.__supprimer) { const { error } = await sb.from('gazettes').delete().eq('id', g.id); return error ? erreur(error) : (toast('Numéro retiré.'), chargerGazette()); }
  try {
    toast('Mise en ligne des fichiers…');
    const envoyerFichier = async (f, nom) => {
      const chemin = `n${v.numero}/${nom}-${Date.now()}.${f.name.split('.').pop().toLowerCase()}`;
      const { error } = await sb.storage.from('gazettes').upload(chemin, f, { contentType: f.type, upsert: false });
      if (error) throw error;
      return sb.storage.from('gazettes').getPublicUrl(chemin).data.publicUrl;
    };
    const row = { numero: v.numero, titre: v.titre, publie: v.publie };
    if (v.pdf) row.pdf_url = await envoyerFichier(v.pdf, 'gazette');
    if (v.cover) row.cover_url = await envoyerFichier(v.cover, 'couverture');
    const { error } = g ? await sb.from('gazettes').update(row).eq('id', g.id) : await sb.from('gazettes').insert(row);
    if (error) throw error;
    toast(`N°${v.numero} en ligne.`); chargerGazette();
  } catch (e) { erreur(e); }
}


// ═══════════════════════════════════════════════════════
//  CHIFFRES DE LA PAGE IMPACT
// ═══════════════════════════════════════════════════════
async function chargerChiffres() {
  const val = await reglage('chiffres_impact');
  let chiffres = []; try { chiffres = JSON.parse(val || '[]'); } catch (_) {}
  const box = $('#panelChiffres');
  box.innerHTML = sousTitre('Chiffres de l\'impact', '<a class="btn btn--ghost" href="/impact/" target="_blank" rel="noopener">Voir la page Impact</a>') + `
    <p class="lead-admin">Les grands chiffres en haut de la page « Notre impact », dans cet ordre. Un chiffre court (« 179 », « 100 % », « 8e ») et une légende qui se lit comme une phrase (« repas de Noël distribués en décembre 2025 »). Mettez-les à jour après chaque grande opération.</p>
    <div class="settings"><div id="chiffres">${chiffres.map(ligneChiffre).join('')}</div>
      <div class="settings__row"><button class="btn btn--ghost" id="ajChiffre">Ajouter un chiffre</button><button class="btn btn--primary" id="saveChiffres">Enregistrer les chiffres</button></div></div>`;
  $('#ajChiffre').onclick = () => $('#chiffres').insertAdjacentHTML('beforeend', ligneChiffre({ valeur: '', libelle: '' }));
  $('#chiffres').onclick = (e) => { if (e.target.dataset.suppr != null) e.target.closest('.chiffre').remove(); };
  $('#saveChiffres').onclick = async () => {
    const liste = $$('.chiffre', box).map(l => ({ valeur: $('[name=valeur]', l).value.trim(), libelle: $('[name=libelle]', l).value.trim() })).filter(c => c.valeur && c.libelle);
    const { error } = await sb.from('settings').upsert({ key: 'chiffres_impact', value: JSON.stringify(liste) });
    error ? erreur(error) : toast(`${pluriel(liste.length, 'chiffre enregistré', 'chiffres enregistrés')} : la page Impact est à jour.`);
  };
}
const ligneChiffre = (c) => `<div class="chiffre settings__row"><input class="input input--num" name="valeur" value="${esc(c.valeur)}" placeholder="179" aria-label="Chiffre"><input class="input" style="flex:1" name="libelle" value="${esc(c.libelle)}" placeholder="repas de Noël distribués en décembre 2025" aria-label="Légende"><button class="btn btn--ghost btn--sm" data-suppr type="button">Retirer</button></div>`;


// ═══════════════════════════════════════════════════════
//  RÉGLAGES
// ═══════════════════════════════════════════════════════
async function chargerReglages() {
  const { data } = await sb.from('settings').select('*').in('key', ['objectif_lutins', 'email_admin', 'capacite_etudiants']);
  const r = Object.fromEntries((data || []).map(x => [x.key, x.value]));
  const box = $('#reglagesPlus');
  box.innerHTML = `
    <div class="settings"><h2 class="settings__title">Places à l'épicerie étudiante</h2>
      <p class="settings__desc">Nombre de personnes accueillies à chaque épicerie étudiante, sauf si un mois a son propre nombre (rubrique Épicerie étudiante › Les 12 prochains mois). Au-delà, les inscriptions passent en liste d'attente et reçoivent une place toutes seules dès qu'une personne se désiste. Laissez vide pour ne fixer aucune limite.</p>
      <div class="settings__row"><input type="number" class="input input--num" id="capDefaut" min="1" max="500" value="${esc(r.capacite_etudiants || '')}" placeholder="—" aria-label="Places"><span class="settings__unit">personnes par épicerie</span><button class="btn btn--primary" data-cle="capacite_etudiants" data-src="capDefaut">Enregistrer</button></div></div>
    <div class="settings"><h2 class="settings__title">Objectif des lutins de Noël</h2>
      <p class="settings__desc">Nombre de lettres d'enfants à parrainer cette année. La page « Aider » affiche alors une jauge (lettres déjà demandées sur l'objectif), qui donne envie de compléter. Laissez vide pour masquer la jauge.</p>
      <div class="settings__row"><input type="number" class="input input--num" id="objLutins" min="1" value="${esc(r.objectif_lutins || '')}" placeholder="—" aria-label="Lettres"><span class="settings__unit">lettres</span><button class="btn btn--primary" data-cle="objectif_lutins" data-src="objLutins">Enregistrer</button></div></div>
    <div class="settings"><h2 class="settings__title">Adresse qui reçoit les alertes</h2>
      <p class="settings__desc">Cette adresse reçoit un e-mail chaque fois qu'un·e bénévole confirme son inscription (pour la valider) ou se désiste. Une boîte partagée par l'équipe est l'idéal.</p>
      <div class="settings__row"><input type="email" class="input" style="min-width:280px" id="emailAdmin" value="${esc(r.email_admin || '')}" aria-label="Adresse e-mail"><button class="btn btn--primary" data-cle="email_admin" data-src="emailAdmin">Enregistrer</button></div></div>`;
  $$('[data-cle]', box).forEach(b => b.onclick = async () => {
    const val = $('#' + b.dataset.src).value.trim();
    const { error } = val ? await sb.from('settings').upsert({ key: b.dataset.cle, value: val }) : await sb.from('settings').delete().eq('key', b.dataset.cle);
    error ? erreur(error) : (toast('Enregistré.'), changement());
  });
}
