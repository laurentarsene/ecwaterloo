/* ══════════════════════════════════════════════════════════════
   ECW — vivant.js
   Contenus tirés de la base (gérés dans l'espace admin) :
   calendrier des bénévoles, page /suivi/, agenda, besoins du moment,
   jauge des lutins, gazettes et abonnement, chiffres d'impact.
   S'appuie sur ECW, makeModal, fmtJour, fmtHeure, echap, lienAgenda (main.js).
   ══════════════════════════════════════════════════════════════ */

const COULEURS_CAT = { coral: '#f26d5f', teal: '#4d9aa8', olive: '#aeb02b', navy: '#1f3038', gold: '#e8b53a', blue: '#3a74e0' };
const jourCle = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
const majus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ══════════════════════════════════════════════════════════════
   CALENDRIER DES BÉNÉVOLES (/benevoles/)
   ══════════════════════════════════════════════════════════════ */
(function () {
  const racine = document.getElementById('calendrier');
  if (!racine || !ECW.pret) return;
  const casesEl = document.getElementById('calCases'), listeEl = document.getElementById('calListe');
  const titreEl = document.getElementById('calTitre'), listeT = document.getElementById('calListeTitre');
  const filtresEl = document.getElementById('calFiltres'), toutBtn = document.getElementById('calTout');
  let creneaux = [], filtre = null, jourChoisi = null;
  const auj = new Date(); let mois = new Date(auj.getFullYear(), auj.getMonth(), 1);

  const visibles = () => creneaux.filter(c => !filtre || c.categorie_id === filtre);

  function carte(c) {
    const complet = c.restantes <= 0;
    return `<article class="crn" style="--c:${COULEURS_CAT[c.couleur] || '#1f3038'}">
      <div class="crn__quand"><strong>${fmtHeure(c.debut)} – ${fmtHeure(c.fin)}</strong></div>
      <div class="crn__quoi"><h3 class="crn__t">${echap(c.categorie)}</h3>${c.note ? `<p class="crn__note">${echap(c.note)}</p>` : ''}${c.description ? `<p>${echap(c.description)}</p>` : ''}</div>
      <div class="crn__action"><span class="crn__places ${complet ? 'is-complet' : c.restantes === 1 ? 'is-presque' : ''}">${complet ? 'Complet' : `${c.restantes} place${c.restantes > 1 ? 's' : ''}`}</span>
        <button type="button" class="btn ${complet ? 'btn--line' : 'btn--dark'}" data-creneau="${c.id}" ${complet ? 'disabled' : ''}>${complet ? 'Complet' : "Je m'inscris"}</button></div>
    </article>`;
  }

  function rendreListe() {
    let liste = visibles();
    if (jourChoisi) liste = liste.filter(c => jourCle(c.debut) === jourChoisi);
    listeT.textContent = jourChoisi ? majus(fmtJour(jourChoisi + 'T12:00')) : 'Prochains créneaux';
    toutBtn.hidden = !jourChoisi;
    if (!liste.length) {
      listeEl.innerHTML = `<p class="cal__vide">${creneaux.length ? 'Aucun créneau pour cette sélection.' : "Aucun créneau n'est ouvert pour le moment. L'équipe en publie régulièrement : repassez bientôt, ou appelez-nous."}</p>`;
      return;
    }
    // Groupés par jour
    const parJour = {};
    liste.slice(0, jourChoisi ? 50 : 30).forEach(c => (parJour[jourCle(c.debut)] ||= []).push(c));
    listeEl.innerHTML = Object.entries(parJour).map(([j, cs]) => `${jourChoisi ? '' : `<p class="cal__jour">${majus(fmtJour(j + 'T12:00'))}</p>`}${cs.map(carte).join('')}`).join('');
  }

  function rendreMois() {
    titreEl.textContent = majus(new Intl.DateTimeFormat('fr-BE', { month: 'long', year: 'numeric' }).format(mois));
    const premier = (mois.getDay() + 6) % 7; // lundi = 0
    const nb = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
    const parJour = {};
    visibles().forEach(c => (parJour[jourCle(c.debut)] ||= []).push(c));
    let h = '';
    for (let i = 0; i < premier; i++) h += '<span class="cal__case is-vide"></span>';
    for (let d = 1; d <= nb; d++) {
      const cle = `${mois.getFullYear()}-${String(mois.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cs = parJour[cle] || [];
      const passe = cle < jourCle(new Date());
      const libre = cs.some(c => c.restantes > 0);
      const points = [...new Set(cs.map(c => c.couleur))].slice(0, 3).map(k => `<i style="background:${COULEURS_CAT[k]}"></i>`).join('');
      h += cs.length
        ? `<button type="button" class="cal__case has-cr ${libre ? '' : 'is-plein'} ${cle === jourChoisi ? 'is-choisi' : ''}" data-jour="${cle}" aria-pressed="${cle === jourChoisi}" aria-label="${fmtJour(cle + 'T12:00')} : ${cs.length} créneau${cs.length > 1 ? 'x' : ''}${libre ? '' : ', complet'}"><span>${d}</span><span class="cal__pts">${points}</span></button>`
        : `<span class="cal__case ${passe ? 'is-passe' : ''}">${d}</span>`;
    }
    casesEl.innerHTML = h;
    const debutMois = new Date(auj.getFullYear(), auj.getMonth(), 1);
    document.getElementById('calPrec').disabled = mois <= debutMois;
  }

  function rendreFiltres() {
    const cats = [...new Map(creneaux.map(c => [c.categorie_id, c])).values()];
    filtresEl.innerHTML = cats.length > 1 ? [`<button type="button" class="cal__filtre ${!filtre ? 'is-on' : ''}" data-cat="" aria-pressed="${!filtre}">Tout</button>`,
      ...cats.map(c => `<button type="button" class="cal__filtre ${filtre === c.categorie_id ? 'is-on' : ''}" data-cat="${c.categorie_id}" aria-pressed="${filtre === c.categorie_id}" style="--c:${COULEURS_CAT[c.couleur]}"><i></i>${echap(c.categorie)}</button>`)].join('') : '';
  }

  const tout = () => { rendreFiltres(); rendreMois(); rendreListe(); };
  casesEl.addEventListener('click', (e) => { const b = e.target.closest('[data-jour]'); if (!b) return; jourChoisi = jourChoisi === b.dataset.jour ? null : b.dataset.jour; rendreMois(); rendreListe(); if (window.matchMedia('(max-width: 899.98px)').matches) listeT.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  filtresEl.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; filtre = b.dataset.cat || null; jourChoisi = null; tout(); });
  toutBtn.addEventListener('click', () => { jourChoisi = null; rendreMois(); rendreListe(); });
  document.getElementById('calPrec').addEventListener('click', () => { mois = new Date(mois.getFullYear(), mois.getMonth() - 1, 1); rendreMois(); });
  document.getElementById('calSuiv').addEventListener('click', () => { mois = new Date(mois.getFullYear(), mois.getMonth() + 1, 1); rendreMois(); });

  const charger = () => ECW.rpc('benevole_creneaux_publics').then(d => { creneaux = d || []; tout(); })
    .catch(() => { listeEl.innerHTML = '<p class="cal__vide">Le calendrier ne répond pas pour le moment. Appelez-nous au 0465&nbsp;92&nbsp;73&nbsp;66.</p>'; });
  charger();

  // ── Inscription ──
  const overlay = document.getElementById('benModal');
  const form = document.getElementById('benForm'), succes = document.getElementById('benSucces'), err = document.getElementById('benErreur');
  const modal = makeModal(overlay, { onOpen: () => { form.hidden = false; succes.hidden = true; err.hidden = true; } });
  listeEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-creneau]'); if (!b) return;
    const c = creneaux.find(x => x.id === b.dataset.creneau); if (!c) return;
    document.getElementById('benCreneau').value = c.id;
    document.getElementById('benTitre').textContent = c.categorie;
    document.getElementById('benRecap').innerHTML = `<p><strong>${majus(fmtJour(c.debut))}</strong>, de ${fmtHeure(c.debut)} à ${fmtHeure(c.fin)}</p><p>${echap(c.lieu)}</p>${c.consignes ? `<p class="ben-recap__c">${echap(c.consignes)}</p>` : ''}`;
    modal.open();
  });
  document.getElementById('benFermer').addEventListener('click', modal.close);
  document.getElementById('benBackdrop').addEventListener('click', modal.close);
  document.getElementById('benOk').addEventListener('click', modal.close);
  const MSG = { complet: 'Ce créneau vient d\'être complété. Choisissez-en un autre.', deja_inscrit: 'Vous êtes déjà inscrit·e à ce créneau avec cette adresse.', creneau_indisponible: 'Ce créneau n\'est plus disponible.', trop_de_demandes: 'Trop d\'inscriptions avec cette adresse aujourd\'hui. Appelez-nous.', champ_email: 'L\'adresse e-mail ne semble pas valide.', champ_prenom: 'Indiquez votre prénom.', champ_nom: 'Indiquez votre nom.' };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    form.querySelectorAll('.sform__input--error').forEach(i => i.classList.remove('sform__input--error'));
    const val = (n) => form.querySelector(`[name="${n}"]`).value.trim();
    const manque = ['prenom', 'nom'].filter(n => !val(n));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) manque.push('email');
    if (manque.length) { manque.forEach(n => form.querySelector(`[name="${n}"]`).classList.add('sform__input--error')); form.querySelector(`[name="${manque[0]}"]`).focus(); return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; const lab = btn.textContent; btn.textContent = 'Envoi…';
    try {
      await ECW.api('benevole_inscrire', Object.fromEntries(['creneau_id', 'prenom', 'nom', 'email', 'telephone', 'message', 'site_web'].map(n => [n, val(n)])));
      form.hidden = true; succes.hidden = false; document.getElementById('benOk').focus();
      charger();
    } catch (x) {
      err.textContent = MSG[x.code] || 'L\'inscription n\'a pas pu être envoyée. Réessayez, ou appelez-nous au 0465 92 73 66.';
      err.hidden = false;
      if (['complet', 'creneau_indisponible'].includes(x.code)) charger();
    } finally { btn.disabled = false; btn.textContent = lab; }
  });
})();

/* ══════════════════════════════════════════════════════════════
   PAGE /suivi/ : ce que permet un lien reçu par e-mail
   ══════════════════════════════════════════════════════════════ */
(function () {
  const carte = document.getElementById('suiviCarte');
  if (!carte) return;
  const token = new URLSearchParams(location.search).get('t') || '';
  const tel = '<a href="tel:+32465927366">0465&nbsp;92&nbsp;73&nbsp;66</a>';
  const STATUTS = {
    etudiant: { 'confirmé': 'Inscription confirmée', 'rappel_envoyé': 'Inscription confirmée', 'liste_attente': "Sur la liste d'attente", 'annulé': 'Inscription annulée', 'présent': 'Présence enregistrée', 'absent': 'Absence enregistrée' },
    benevole: { a_confirmer: 'À confirmer', confirme: "Confirmée, en attente de l'équipe", valide: 'Validée', refuse: 'Non retenue', annule: 'Annulée', expire: 'Expirée (non confirmée à temps)' },
    gazette: { a_confirmer: 'À confirmer', actif: 'Abonné·e', desabonne: 'Désabonné·e' },
  };
  let confirmerAnnulation = false, message = '';

  function rendre(r) {
    let h = '';
    const st = (STATUTS[r.type] || {})[r.statut] || r.statut;
    if (r.type === 'etudiant') {
      h = `<p class="suivi__k">Épicerie étudiante</p><h1 class="h-big">Bonjour ${echap(r.prenom)}</h1>
        <dl class="suivi__dl"><div><dt>Date</dt><dd>${echap(r.date_rdv)}</dd></div><div><dt>Pour</dt><dd>${r.nb} personne${r.nb > 1 ? 's' : ''}</dd></div><div><dt>Statut</dt><dd><span class="suivi__st suivi__st--${r.statut === 'annulé' ? 'off' : 'on'}">${st}</span></dd></div></dl>`;
    }
    if (r.type === 'benevole') {
      const c = r.creneau;
      h = `<p class="suivi__k">Bénévolat</p><h1 class="h-big">Bonjour ${echap(r.prenom)}</h1>
        <dl class="suivi__dl"><div><dt>Créneau</dt><dd><strong>${echap(c.categorie)}</strong><br>${majus(fmtJour(c.debut))}, de ${fmtHeure(c.debut)} à ${fmtHeure(c.fin)}</dd></div><div><dt>Lieu</dt><dd>${echap(c.lieu)}</dd></div><div><dt>Statut</dt><dd><span class="suivi__st suivi__st--${['annule', 'refuse', 'expire'].includes(r.statut) ? 'off' : 'on'}">${st}</span>${r.presence === 'oui' ? ' · présence confirmée ✓' : ''}</dd></div></dl>
        ${r.statut === 'valide' && c.consignes ? `<p class="suivi__info">${echap(c.consignes)}</p>` : ''}`;
    }
    if (r.type === 'gazette') {
      h = `<p class="suivi__k">La Gazette conviviale</p><h1 class="h-big">Votre abonnement</h1>
        <dl class="suivi__dl"><div><dt>Adresse</dt><dd>${echap(r.email)}</dd></div><div><dt>Statut</dt><dd><span class="suivi__st suivi__st--${r.statut === 'actif' ? 'on' : 'off'}">${st}</span></dd></div></dl>`;
    }
    if (message) h += `<p class="suivi__ok" role="status">${message}</p>`;
    const a = r.actions || [];
    const boutons = [];
    if (r.type === 'benevole' && a.includes('confirmer')) boutons.push(['confirmer', 'Je confirme mon inscription', 'dark']);
    if (r.type === 'gazette' && a.includes('confirmer')) boutons.push(['confirmer', r.statut === 'desabonne' ? 'Me réabonner' : 'Je confirme mon abonnement', 'dark']);
    if (a.includes('presence_oui') && r.presence !== 'oui') boutons.push(['presence_oui', 'Je serai là', 'dark']);
    if (a.includes('annuler')) boutons.push(confirmerAnnulation ? ['annuler', 'Oui, je ne peux plus venir', 'danger'] : ['pre_annuler', r.type === 'etudiant' && r.statut === 'liste_attente' ? 'Me retirer de la liste' : 'Je ne peux plus venir', 'line']);
    if (r.type === 'gazette' && a.includes('desabonner') && r.statut === 'actif') boutons.push(['desabonner', 'Me désabonner', 'line']);
    if (confirmerAnnulation) h += `<p class="suivi__info">Sûr·e&nbsp;? Votre place sera libérée pour quelqu'un d'autre.</p>`;
    if (boutons.length) h += `<div class="btns suivi__btns">${boutons.map(([q, l, s]) => `<button type="button" class="btn btn--lg btn--${s}" data-quoi="${q}">${l}</button>`).join('')}${confirmerAnnulation ? '<button type="button" class="btn btn--lg btn--line" data-quoi="garder">Non, je garde ma place</button>' : ''}</div>`;
    h += `<p class="suivi__aide">Une question&nbsp;? Appelez-nous au ${tel}.</p>`;
    carte.innerHTML = h;
  }

  const MESSAGES = {
    confirmer: { benevole: "Merci, c'est confirmé ! L'équipe va valider votre venue : vous recevrez un e-mail.", gazette: 'Merci ! Vous recevrez le prochain numéro par e-mail.' },
    presence_oui: 'Merci, à demain !', annuler: "C'est noté. Merci de nous avoir prévenus : votre place est libérée.", desabonner: 'Vous ne recevrez plus la gazette par e-mail.',
  };
  let dernier = null;
  async function agir(quoi) {
    if (quoi === 'pre_annuler') { confirmerAnnulation = true; return rendre(dernier); }
    if (quoi === 'garder') { confirmerAnnulation = false; return rendre(dernier); }
    carte.querySelectorAll('button').forEach(b => b.disabled = true);
    try {
      const r = await ECW.api('suivi_action', { token, quoi });
      confirmerAnnulation = false;
      const m = MESSAGES[quoi]; message = typeof m === 'string' ? m : (m && m[r.type]) || '';
      dernier = r; rendre(r);
    } catch (e) { carte.insertAdjacentHTML('beforeend', `<p class="sform__error">Cela n'a pas fonctionné. Réessayez, ou appelez-nous au ${tel}.</p>`); carte.querySelectorAll('button').forEach(b => b.disabled = false); }
  }
  carte.addEventListener('click', (e) => { const b = e.target.closest('[data-quoi]'); if (b) agir(b.dataset.quoi); });

  if (!token || !ECW.pret) { carte.innerHTML = `<h1 class="h-big">Lien incomplet</h1><p class="txt-18">Ce lien semble incomplet. Utilisez le bouton de l'e-mail reçu, ou appelez-nous au ${tel}.</p>`; return; }
  ECW.api('suivi', { token }).then(r => { dernier = r; rendre(r); })
    .catch(() => { carte.innerHTML = `<h1 class="h-big">Lien introuvable</h1><p class="txt-18">Ce lien n'est plus valable. Appelez-nous au ${tel}, nous regarderons avec vous.</p>`; });
})();

/* ══════════════════════════════════════════════════════════════
   AGENDA (accueil : 3 prochains ; /agenda/ : tout)
   ══════════════════════════════════════════════════════════════ */
(function () {
  const court = document.getElementById('avenirListe'), page = document.getElementById('agendaListe');
  if ((!court && !page) || !ECW.pret) return;
  const auj = jourCle(new Date());
  const titre = page ? 'h2' : 'h3';   // /agenda/ : sous le h1 ; accueil : sous « À venir » (h2)
  const item = (a) => {
    const d = a.date_evenement ? new Date(a.date_evenement + 'T12:00') : null;
    const lien = a.lien_url ? `<a class="agenda__lien" href="${echap(a.lien_url)}"${/^https?:/.test(a.lien_url) ? ' target="_blank" rel="noopener"' : ''}>${echap(a.lien_label || 'En savoir plus')}<span aria-hidden="true">→</span></a>` : '';
    return `<li class="agenda__item">${d ? `<div class="agenda__date" aria-hidden="true"><b>${d.getDate()}</b><span>${new Intl.DateTimeFormat('fr-BE', { month: 'short' }).format(d).replace('.', '')}</span></div>` : '<div class="agenda__date agenda__date--nouv" aria-hidden="true"><span>Nouvelle</span></div>'}
      <div class="agenda__txt"><${titre} class="agenda__titre">${echap(a.titre)}</${titre}><p class="agenda__meta">${d ? majus(fmtJour(d)) : ''}${a.heure ? ` · ${echap(a.heure)}` : ''}${a.lieu ? ` · ${echap(a.lieu)}` : ''}</p>${a.texte ? `<p>${echap(a.texte).replace(/\n/g, '<br>')}</p>` : ''}${lien}</div></li>`;
  };
  ECW.lire('actus', 'select=*&order=date_evenement.asc.nullslast,created_at.desc').then(actus => {
    const avenir = actus.filter(a => a.date_evenement && a.date_evenement >= auj);
    const nouvelles = actus.filter(a => !a.date_evenement || a.date_evenement < auj).sort((x, y) => (y.date_evenement || y.created_at).localeCompare(x.date_evenement || x.created_at));
    if (court && avenir.length) { court.innerHTML = avenir.slice(0, 3).map(item).join(''); document.getElementById('a-venir').hidden = false; }
    if (page) {
      page.innerHTML = avenir.length ? avenir.map(item).join('') : '<li class="cal__vide">Pas d\'événement annoncé pour le moment. Revenez bientôt&nbsp;!</li>';
      if (nouvelles.length) { document.getElementById('agendaPassees').innerHTML = nouvelles.slice(0, 12).map(item).join(''); document.getElementById('agendaPasseesT').hidden = false; }
    }
  }).catch(() => { if (page) page.innerHTML = '<li class="cal__vide">L\'agenda ne répond pas pour le moment.</li>'; });
})();

/* ══════════════════════════════════════════════════════════════
   AIDER : besoins du moment, jauge des lutins, prochains créneaux
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!ECW.pret) return;
  const bloc = document.getElementById('besoinsBloc');
  if (bloc) ECW.lire('besoins', 'select=libelle,detail,urgent&order=urgent.desc,ordre.asc').then(b => {
    if (!b.length) return;
    document.getElementById('besoinsListe').innerHTML = b.map(x => `<li class="${x.urgent ? 'is-urgent' : ''}">${x.urgent ? '<span class="besoins__urgent">Urgent</span>' : ''}<strong>${echap(x.libelle)}</strong>${x.detail ? ` <span>${echap(x.detail)}</span>` : ''}</li>`).join('');
    bloc.hidden = false;
    const p = document.getElementById('besoinsPartager');
    if (navigator.share && p) { p.hidden = false; p.onclick = () => navigator.share({ title: "Les besoins de l'épicerie sociale de Waterloo", text: `En ce moment, l'épicerie sociale de Waterloo a besoin de : ${b.map(x => x.libelle).join(', ')}.`, url: location.origin + '/aider/#besoins' }).catch(() => {}); }
  }).catch(() => {});

  const jauge = document.getElementById('lutinsJauge');
  if (jauge) ECW.rpc('lutins_progression').then(r => {
    if (!r || !r.objectif) return;
    const pct = Math.min(100, Math.round(r.lettres / r.objectif * 100));
    const barre = document.getElementById('lutinsBarre');
    barre.setAttribute('aria-valuemax', r.objectif); barre.setAttribute('aria-valuenow', r.lettres);
    barre.setAttribute('aria-label', `${r.lettres} lettres parrainées sur ${r.objectif}`);
    barre.firstElementChild.style.width = pct + '%';
    document.getElementById('lutinsTxt').innerHTML = r.lettres >= r.objectif
      ? `<b>Objectif atteint&nbsp;: ${r.lettres} lettres parrainées</b> cette année. Merci&nbsp;! Vous pouvez encore vous inscrire pour la liste d'attente.`
      : `<b>${r.lettres} lettre${r.lettres > 1 ? 's' : ''} parrainée${r.lettres > 1 ? 's' : ''} sur ${r.objectif}</b> cette année. Encore ${r.objectif - r.lettres} enfant${r.objectif - r.lettres > 1 ? 's' : ''} à gâter&nbsp;!`;
    jauge.hidden = false;
  }).catch(() => {});

  const apercu = document.getElementById('benApercu');
  if (apercu) ECW.rpc('benevole_creneaux_publics').then(cs => {
    const libres = (cs || []).filter(c => c.restantes > 0).slice(0, 3);
    if (!libres.length) return;
    document.getElementById('benApercuListe').innerHTML = libres.map(c => `<li style="--c:${COULEURS_CAT[c.couleur]}"><a href="/benevoles/"><strong>${echap(c.categorie)}</strong><span>${majus(fmtJour(c.debut, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${fmtHeure(c.debut)}–${fmtHeure(c.fin)} · ${c.restantes} place${c.restantes > 1 ? 's' : ''}</span></a></li>`).join('');
    apercu.hidden = false;
  }).catch(() => {});
})();

/* ══════════════════════════════════════════════════════════════
   GAZETTES : derniers numéros depuis la base, archives, abonnement
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!ECW.pret) return;
  const covers = document.querySelector('.gaz__covers');
  if (covers) ECW.lire('gazettes', 'select=numero,titre,pdf_url,cover_url&order=numero.desc').then(gz => {
    if (!gz.length) return;
    const [g1, g2] = gz;
    const bouton = (g, dos) => `<button type="button" class="gaz__cover${dos ? ' gaz__cover--back' : ''}" data-open-gazette data-pdf="${echap(g.pdf_url)}" data-title="N°${g.numero} · ${echap(g.titre)}" aria-label="Feuilleter la gazette N°${g.numero}, ${echap(g.titre)}"><img src="${echap(g.cover_url)}" width="910" height="1287" alt=""></button>`;
    covers.innerHTML = (g2 ? bouton(g2, true) : '') + bouton(g1, false);
    const btns = document.querySelector('.gaz__txt .btns');
    if (btns) btns.innerHTML = [g1, g2].filter(Boolean).map((g, i) => `<a href="${echap(g.pdf_url)}" class="btn ${i ? 'btn--line' : 'btn--dark'}" data-open-gazette data-pdf="${echap(g.pdf_url)}" data-title="N°${g.numero} · ${echap(g.titre)}">Lire le N°${g.numero} · ${echap(g.titre.toLowerCase())}</a>`).join('');
    const arch = document.getElementById('gazArchives');
    if (arch && gz.length > 2) { arch.innerHTML = '<li class="gaz__archives-t">Anciens numéros</li>' + gz.slice(2).map(g => `<li><a href="${echap(g.pdf_url)}" data-open-gazette data-pdf="${echap(g.pdf_url)}" data-title="N°${g.numero} · ${echap(g.titre)}">N°${g.numero} · ${echap(g.titre)}</a></li>`).join(''); arch.hidden = false; }
  }).catch(() => {});

  const form = document.getElementById('abonnement');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('aboMsg'), email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'Cette adresse e-mail ne semble pas valide.'; msg.className = 'abonnement__msg is-err'; form.email.focus(); return; }
    const b = form.querySelector('button'); b.disabled = true;
    try {
      const r = await ECW.api('gazette_abonner', { email, site_web: form.site_web.value });
      msg.textContent = r.statut === 'deja_abonne' ? 'Vous êtes déjà abonné·e : merci !' : 'Presque fini : confirmez votre adresse en cliquant sur le lien reçu par e-mail.';
      msg.className = 'abonnement__msg is-ok'; form.reset();
    } catch (_) { msg.textContent = "L'inscription n'a pas fonctionné. Réessayez plus tard."; msg.className = 'abonnement__msg is-err'; }
    b.disabled = false;
  });
})();

/* ══════════════════════════════════════════════════════════════
   NOTRE IMPACT : chiffres modifiables dans l'admin
   ══════════════════════════════════════════════════════════════ */
(function () {
  const ul = document.getElementById('chiffresListe');
  if (!ul || !ECW.pret) return;
  ECW.lire('settings', 'select=value&key=eq.chiffres_impact').then(r => {
    const liste = JSON.parse(r?.[0]?.value || '[]');
    if (liste.length) ul.innerHTML = liste.map(c => `<li><b>${echap(c.valeur)}</b><span>${echap(c.libelle)}</span></li>`).join('');
  }).catch(() => {});
})();
