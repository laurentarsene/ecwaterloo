// ═══════════════════════════════════════════════════════
//  ECW Admin — dates & places, bénévoles, agenda, besoins, gazette, réglages
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
    if (supprimer) $('.modal__suppr', d).onclick = () => { if (confirm(supprimer)) fin({ __supprimer: true }); };
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

// Panneau : titre + contenu, chargé à l'ouverture de l'onglet
const charges = {};
window.addEventListener('ecw:onglet', (e) => { const f = { dates: chargerDates, benevoles: chargerBenevoles, agenda: chargerAgenda, besoins: chargerBesoins, gazette: chargerGazette, parametres: chargerReglages }[e.detail]; if (f) f().catch(erreur); });
const entete = (kicker, titre, actions = '') => `<div class="dash__heading dash__heading--row"><div><span class="dash__kicker">${kicker}</span><h1 class="dash__title">${titre}</h1></div><div class="toolbar__right">${actions}</div></div>`;

// Compteur « à valider » dans l'onglet Bénévoles, dès la connexion
async function compterAValider() {
  const { count } = await sb.from('benevole_inscriptions').select('id', { count: 'exact', head: true }).eq('statut', 'confirme');
  const b = $('#countAValider'); if (!b) return;
  b.textContent = count || ''; b.hidden = !count;
}
sb.auth.onAuthStateChange((ev, session) => { if (session) compterAValider(); });


// ═══════════════════════════════════════════════════════
//  DATES & PLACES (épicerie étudiante)
// ═══════════════════════════════════════════════════════
async function chargerDates() {
  const p = $('#panelDates');
  const [{ data: mois }, { data: reg }, { data: prochaine }, { data: inscrits }] = await Promise.all([
    sb.from('epicerie_mois').select('*'),
    sb.from('settings').select('value').eq('key', 'capacite_etudiants').maybeSingle(),
    sb.rpc('epicerie_prochaine'),
    sb.from('inscriptions_etudiantes').select('date_rdv, nb_personnes, statut'),
  ]);
  const parMois = Object.fromEntries((mois || []).map(m => [m.mois, m]));
  const capDefaut = reg?.value || '';
  const today = new Date(); const lignes = [];
  for (let i = 0; i < 12; i++) {
    const d1 = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const cle = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}`;
    const premierJeudi = new Date(d1.getFullYear(), d1.getMonth(), 1 + (4 - d1.getDay() + 7) % 7);
    const m = parMois[cle];
    const jour = m?.jour ? new Date(m.jour + 'T12:00') : premierJeudi;
    const lib = libelleDate(jour);
    const pris = (inscrits || []).filter(r => r.date_rdv === lib && ['confirmé', 'rappel_envoyé', 'présent'].includes(r.statut)).reduce((a, r) => a + r.nb_personnes, 0);
    const attente = (inscrits || []).filter(r => r.date_rdv === lib && r.statut === 'liste_attente').length;
    lignes.push({ cle, m, jour, premierJeudi, lib, pris, attente });
  }
  p.innerHTML = entete('Épicerie étudiante', 'Dates & places') + `
    <p class="lead-admin">Par défaut, l'épicerie étudiante a lieu le premier jeudi du mois. Ici, vous pouvez déplacer une date, annuler un mois ou limiter le nombre de places. Le site, les inscriptions et les rappels suivent automatiquement.</p>
    <div class="card-admin">
      <h2 class="card-admin__t">Capacité par défaut</h2>
      <p class="settings__desc">Nombre maximum de personnes par épicerie (une inscription peut compter plusieurs personnes). Au-delà, les inscriptions passent en liste d'attente et montent toutes seules si quelqu'un se désiste. Vide = pas de limite.</p>
      <div class="settings__row"><input type="number" class="input input--num" id="capDefaut" min="1" max="500" value="${esc(capDefaut)}" placeholder="—"><span class="settings__unit">personnes</span><button class="btn btn--primary" id="saveCap">Enregistrer</button></div>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Mois</th><th>Date</th><th>Places</th><th class="text-center">Inscrit·es</th><th>Note publique</th><th class="text-center">Statut</th><th></th></tr></thead><tbody>
    ${lignes.map(l => `<tr data-mois="${l.cle}" class="${l.m?.annule ? 'is-off' : ''}">
      <td class="td-name">${MOIS[l.jour.getMonth()]} ${l.jour.getFullYear()}${prochaine?.mois === l.cle ? ' <span class="pill">prochaine</span>' : ''}</td>
      <td><input type="date" class="input" name="jour" value="${isoLocal(l.jour).date}" min="${l.cle}-01" max="${l.cle}-31">${l.m?.jour ? '<small class="td-muted"> déplacée</small>' : ''}</td>
      <td><input type="number" class="input input--num" name="capacite" min="1" value="${l.m?.capacite ?? ''}" placeholder="${capDefaut || '∞'}"></td>
      <td class="text-center">${l.pris}${l.attente ? ` <small class="td-muted">+${l.attente} en attente</small>` : ''}</td>
      <td><input type="text" class="input" name="note" value="${esc(l.m?.note || '')}" placeholder="ex. Exceptionnellement le 2e jeudi"></td>
      <td class="text-center"><label class="switch"><input type="checkbox" name="ouvert" ${l.m?.annule ? '' : 'checked'}><span>${l.m?.annule ? 'Annulée' : 'Ouverte'}</span></label></td>
      <td class="text-right"><button class="btn btn--primary btn--sm" data-act="save">Enregistrer</button>${l.m ? ' <button class="btn btn--ghost btn--sm" data-act="reset" title="Revenir au premier jeudi, sans limite particulière">Rétablir</button>' : ''}</td>
    </tr>`).join('')}
    </tbody></table></div>`;
  $('#saveCap').onclick = async () => {
    const v = $('#capDefaut').value.trim();
    const { error } = v ? await sb.from('settings').upsert({ key: 'capacite_etudiants', value: v }) : await sb.from('settings').delete().eq('key', 'capacite_etudiants');
    error ? erreur(error) : toast(v ? `Capacité par défaut : ${v} personnes.` : 'Plus de limite par défaut.');
  };
  $$('tr[data-mois]', p).forEach(tr => {
    $('input[name=ouvert]', tr).onchange = (e) => { e.target.nextElementSibling.textContent = e.target.checked ? 'Ouverte' : 'Annulée'; };
    tr.addEventListener('click', async (e) => {
      const act = e.target.dataset.act; if (!act) return;
      const mois = tr.dataset.mois;
      if (act === 'reset') { const { error } = await sb.from('epicerie_mois').delete().eq('mois', mois); return error ? erreur(error) : (toast('Mois rétabli.'), chargerDates()); }
      const jour = $('input[name=jour]', tr).value, cap = $('input[name=capacite]', tr).value;
      if (!jour.startsWith(mois)) return toast('La date doit rester dans le même mois.', false);
      const premier = lignes.find(l => l.cle === mois).premierJeudi;
      const row = { mois, jour: jour === isoLocal(premier).date ? null : jour, capacite: cap ? Number(cap) : null, note: $('input[name=note]', tr).value.trim(), annule: !$('input[name=ouvert]', tr).checked, updated_at: new Date().toISOString() };
      const { error } = await sb.from('epicerie_mois').upsert(row);
      error ? erreur(error) : (toast(`${MOIS[Number(mois.slice(5)) - 1]} enregistré.`), chargerDates());
    });
  });
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

  p.innerHTML = entete('Bénévoles', 'Calendrier des bénévoles', `<a class="btn btn--ghost" href="/benevoles/" target="_blank" rel="noopener">Voir la page publique ↗</a><button class="btn btn--primary" id="btnCreneau">+ Créneau</button><button class="btn btn--primary" id="btnSerie">+ Série de créneaux</button>`) + `
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
        </article>`; }).join('')}</div>` : '<p class="vide">Rien à valider pour le moment.</p>'}
    </section>

    <section class="bloc">
      <div class="bloc__row"><h2 class="bloc__t">Créneaux ${BEN.passes ? '(90 derniers jours et à venir)' : 'à venir'}</h2><label class="switch"><input type="checkbox" id="voirPasses" ${BEN.passes ? 'checked' : ''}><span>Afficher les créneaux passés</span></label></div>
      ${BEN.creneaux.length ? BEN.creneaux.map(c => { const k = cat(c.categorie_id); const inscrits = BEN.ins.filter(i => i.creneau_id === c.id && !['annule', 'expire'].includes(i.statut)); const passe = new Date(c.debut) < new Date(); return `
        <article class="creneau ${passe ? 'is-passe' : ''} ${c.publie ? '' : 'is-off'}" style="--c:${COULEURS[k.couleur]}">
          <div class="creneau__quand"><strong>${fJourCourt(c.debut)}</strong><span>${fHeure(c.debut)}–${fHeure(c.fin)}</span></div>
          <div class="creneau__quoi"><strong>${esc(k.nom)}</strong>${c.note ? ` <span class="td-muted">· ${esc(c.note)}</span>` : ''}${c.publie ? '' : ' <span class="pill">non publié</span>'}
            <div class="creneau__gens">${inscrits.length ? inscrits.map(i => `<span class="gens">${esc(i.prenom)} ${esc(i.nom.charAt(0))}. ${badgeBen(i.statut)}${i.presence === 'oui' ? ' <span title="A confirmé sa présence">✓ présent·e</span>' : ''}</span>`).join('') : '<span class="td-muted">Personne pour l\'instant</span>'}</div>
          </div>
          <div class="creneau__places"><strong>${prises(c)}/${c.places}</strong><span>places</span></div>
          <div class="creneau__a"><button class="btn btn--ghost btn--sm" data-cr="${c.id}" data-act="edit">Modifier</button><button class="btn btn--ghost btn--sm" data-cr="${c.id}" data-act="dup" title="Créer le même créneau une semaine plus tard">+1 semaine</button></div>
        </article>`; }).join('') : '<p class="vide">Aucun créneau. Créez-en un, ou une série (par exemple chaque premier mardi du mois).</p>'}
    </section>

    <section class="bloc">
      <div class="bloc__row"><h2 class="bloc__t">Catégories</h2><button class="btn btn--ghost btn--sm" id="btnCat">+ Catégorie</button></div>
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
  $$('[data-cr]', p).forEach(b => b.onclick = () => { const c = BEN.creneaux.find(x => x.id === b.dataset.cr); b.dataset.act === 'dup' ? dupliquer(c) : editerCreneau(c); });
  $$('[data-dec]', p).forEach(b => b.onclick = () => decider(b.dataset.id, b.dataset.dec));
}

async function decider(id, decision) {
  const i = BEN.ins.find(x => x.id === id);
  const v = await formulaire({
    titre: decision === 'valide' ? `Valider ${i.prenom} ${i.nom}` : `${i.statut === 'valide' ? 'Retirer' : 'Refuser'} ${i.prenom} ${i.nom}`,
    aide: decision === 'valide' ? 'Un e-mail de validation part avec le créneau à ajouter à l\'agenda et un lien pour se désister.' : 'Un e-mail poli part pour prévenir la personne et l\'inviter à choisir un autre créneau.',
    champs: [{ nom: 'note', label: 'Petit mot ajouté à l\'e-mail (facultatif)', type: 'textarea', lignes: 2 }],
    valider: decision === 'valide' ? 'Valider et envoyer l\'e-mail' : 'Confirmer et envoyer l\'e-mail',
  });
  if (!v) return;
  try { await api({ action: 'benevole_decision', id, decision, note: v.note }); toast(decision === 'valide' ? 'Validé, e-mail envoyé.' : 'E-mail envoyé.'); chargerBenevoles(); } catch (e) { erreur(e); }
}

const champsCreneau = () => [
  { nom: 'categorie_id', label: 'Catégorie', type: 'select', requis: true, options: BEN.cats.filter(k => k.actif).map(k => [k.id, k.nom]) },
  { nom: 'date', label: 'Date', type: 'date', requis: true, demi: true },
  { nom: 'places', label: 'Nombre de bénévoles', type: 'number', min: 1, max: 200, defaut: 2, requis: true, demi: true },
  { nom: 'debut', label: 'Début', type: 'time', requis: true, demi: true, defaut: '09:00' },
  { nom: 'fin', label: 'Fin', type: 'time', requis: true, demi: true, defaut: '12:00' },
  { nom: 'note', label: 'Précision affichée (facultatif)', placeholder: 'ex. Spécial rentrée scolaire' },
  { nom: 'publie', label: 'Visible dans le calendrier public', type: 'checkbox', defaut: true },
];
const versIso = (date, heure) => new Date(`${date}T${heure}`).toISOString();

async function editerCreneau(c) {
  const val = c ? { ...c, date: isoLocal(c.debut).date, debut: isoLocal(c.debut).heure, fin: isoLocal(c.fin).heure } : {};
  const nbIns = c ? BEN.ins.filter(i => i.creneau_id === c.id && !['annule', 'expire', 'refuse'].includes(i.statut)).length : 0;
  const v = await formulaire({ titre: c ? 'Modifier le créneau' : 'Nouveau créneau', champs: champsCreneau(), valeurs: val,
    supprimer: c ? (nbIns ? `${nbIns} bénévole(s) inscrit·e(s) seront retiré·es sans e-mail automatique. Pensez à les prévenir. Supprimer quand même ?` : 'Supprimer ce créneau ?') : null });
  if (!v) return;
  if (v.__supprimer) { const { error } = await sb.from('benevole_creneaux').delete().eq('id', c.id); return error ? erreur(error) : (toast('Créneau supprimé.'), chargerBenevoles()); }
  if (v.fin <= v.debut) return toast('L\'heure de fin doit être après le début.', false);
  const row = { categorie_id: v.categorie_id, debut: versIso(v.date, v.debut), fin: versIso(v.date, v.fin), places: v.places, note: v.note, publie: v.publie };
  const { error } = c ? await sb.from('benevole_creneaux').update(row).eq('id', c.id) : await sb.from('benevole_creneaux').insert(row);
  error ? erreur(error) : (toast('Créneau enregistré.'), chargerBenevoles());
}

async function dupliquer(c) {
  const plus = (d) => new Date(new Date(d).getTime() + 7 * 864e5).toISOString();
  const { error } = await sb.from('benevole_creneaux').insert({ categorie_id: c.categorie_id, debut: plus(c.debut), fin: plus(c.fin), places: c.places, note: c.note, publie: c.publie });
  error ? erreur(error) : (toast('Créneau copié une semaine plus tard.'), chargerBenevoles());
}

async function creerSerie() {
  const v = await formulaire({ titre: 'Série de créneaux', aide: 'Crée d\'un coup plusieurs créneaux identiques. Exemple : la distribution chaque premier mardi du mois.',
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
  error ? erreur(error) : (toast(`${rows.length} créneaux créés.`), chargerBenevoles());
}

async function editerCategorie(k) {
  const v = await formulaire({ titre: k ? 'Modifier la catégorie' : 'Nouvelle catégorie', valeurs: k || {},
    champs: [
      { nom: 'nom', label: 'Nom', requis: true, placeholder: 'ex. Distribution des colis' },
      { nom: 'description', label: 'Description (ce que fait le ou la bénévole)', type: 'textarea' },
      { nom: 'consignes', label: 'Consignes pratiques (envoyées à la validation)', type: 'textarea', lignes: 2 },
      { nom: 'lieu', label: 'Lieu', defaut: 'Épicerie sociale, rue de la Station 139A, 1410 Waterloo' },
      { nom: 'couleur', label: 'Couleur dans le calendrier', type: 'select', options: Object.entries(NOMS_COULEURS) },
      { nom: 'ordre', label: 'Ordre d\'affichage', type: 'number', min: 0, defaut: BEN.cats.length + 1, demi: true },
      { nom: 'actif', label: 'Visible sur le site', type: 'checkbox', defaut: true },
    ],
    supprimer: k ? 'Supprimer cette catégorie ? (Impossible si des créneaux l\'utilisent : décochez plutôt « Visible ».)' : null });
  if (!v) return;
  if (v.__supprimer) { const { error } = await sb.from('benevole_categories').delete().eq('id', k.id); return error ? toast('Des créneaux utilisent cette catégorie : masquez-la plutôt.', false) : (toast('Catégorie supprimée.'), chargerBenevoles()); }
  const { error } = k ? await sb.from('benevole_categories').update(v).eq('id', k.id) : await sb.from('benevole_categories').insert(v);
  error ? erreur(error) : (toast('Catégorie enregistrée.'), chargerBenevoles());
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
  p.innerHTML = entete('Site', 'Agenda & actus', '<a class="btn btn--ghost" href="/agenda/" target="_blank" rel="noopener">Voir la page publique ↗</a><button class="btn btn--primary" id="btnActu">+ Ajouter</button>') + `
    <p class="lead-admin">Les événements à venir s'affichent sur l'accueil (les 3 prochains) et sur la page Agenda. Une actu sans date apparaît comme une nouvelle.</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Titre</th><th>Lieu</th><th class="text-center">Visible</th><th></th></tr></thead><tbody>
    ${(data || []).map(a => `<tr class="${a.date_evenement && a.date_evenement < aujourdhui ? 'is-passe' : ''}">
      <td class="td-muted" style="white-space:nowrap">${a.date_evenement ? fJourCourt(a.date_evenement + 'T12:00') + (a.heure ? ` · ${esc(a.heure)}` : '') : 'Nouvelle'}</td>
      <td class="td-name">${esc(a.titre)}</td><td class="td-muted">${esc(a.lieu)}</td>
      <td class="text-center">${a.publie ? '✓' : '—'}</td>
      <td class="text-right"><button class="btn btn--ghost btn--sm" data-id="${a.id}">Modifier</button></td></tr>`).join('') || '<tr><td colspan="5" class="vide">Rien pour l\'instant.</td></tr>'}
    </tbody></table></div>`;
  $('#btnActu').onclick = () => editerActu();
  $$('[data-id]', p).forEach(b => b.onclick = () => editerActu(data.find(a => a.id === b.dataset.id)));
}
async function editerActu(a) {
  const v = await formulaire({ titre: a ? 'Modifier' : 'Nouvel événement ou nouvelle', valeurs: a || {}, supprimer: a ? 'Supprimer définitivement ?' : null,
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
  if (v.__supprimer) { const { error } = await sb.from('actus').delete().eq('id', a.id); return error ? erreur(error) : (toast('Supprimé.'), chargerAgenda()); }
  v.date_evenement = v.date_evenement || null;
  const { error } = a ? await sb.from('actus').update(v).eq('id', a.id) : await sb.from('actus').insert(v);
  error ? erreur(error) : (toast('Enregistré.'), chargerAgenda());
}


// ═══════════════════════════════════════════════════════
//  BESOINS DU MOMENT
// ═══════════════════════════════════════════════════════
async function chargerBesoins() {
  const { data, error } = await sb.from('besoins').select('*').order('ordre').order('created_at');
  if (error) throw error;
  const p = $('#panelBesoins');
  p.innerHTML = entete('Dons en nature', 'Besoins du moment', '<a class="btn btn--ghost" href="/aider/#besoins" target="_blank" rel="noopener">Voir sur le site ↗</a>') + `
    <p class="lead-admin">La liste affichée sur la page « Aider ». Marquez « urgent » ce qui manque vraiment : ces lignes passent en premier, en couleur.</p>
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
    if (act === 'suppr') { if (!confirm('Supprimer cette ligne ?')) return; r = await sb.from('besoins').delete().eq('id', id); }
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
  p.innerHTML = entete('La Gazette conviviale', 'Numéros & abonné·es', '<button class="btn btn--primary" id="btnGazette">+ Nouveau numéro</button>') + `
    <div class="stats"><div class="stat"><span class="stat__val">${gz.length}</span><span class="stat__lbl">numéros en ligne</span></div><div class="stat"><span class="stat__val">${actifs.length}</span><span class="stat__lbl">abonné·es</span></div><div class="stat"><span class="stat__val">${(ab || []).filter(a => a.statut === 'a_confirmer').length}</span><span class="stat__lbl">en attente de confirmation</span></div></div>
    <p class="lead-admin">Les deux derniers numéros s'affichent sur la page « Qui sommes-nous ? », les plus anciens en archives. Après la mise en ligne, un bouton envoie le numéro aux abonné·es (une seule fois).</p>
    <div class="cartes cartes--gz">${gz.map(g => `<article class="carte carte--gz ${g.publie ? '' : 'is-off'}">
      <img src="${esc(g.cover_url)}" alt="" loading="lazy">
      <div><div class="carte__h"><strong>N°${g.numero} · ${esc(g.titre)}</strong>${g.publie ? '' : '<span class="pill">masqué</span>'}</div>
      <p class="td-muted">${g.envoyee_at ? `Envoyé le ${fDateHeure(g.envoyee_at)}${g.envoyee_nb != null ? ` à ${g.envoyee_nb} abonné·es` : ''}` : 'Pas encore envoyé aux abonné·es'}</p>
      <div class="carte__a"><a class="btn btn--ghost btn--sm" href="${esc(g.pdf_url)}" target="_blank" rel="noopener">PDF ↗</a><button class="btn btn--ghost btn--sm" data-edit="${g.id}">Modifier</button>${g.envoyee_at ? '' : `<button class="btn btn--primary btn--sm" data-send="${g.id}">Envoyer aux ${actifs.length} abonné·es</button>`}</div></div>
    </article>`).join('')}</div>
    <section class="bloc"><div class="bloc__row"><h2 class="bloc__t">Abonné·es</h2><button class="btn btn--ghost btn--sm" id="exportAb">Exporter CSV</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>E-mail</th><th class="text-center">Statut</th><th>Inscrit·e le</th></tr></thead><tbody>
      ${(ab || []).map(a => `<tr><td>${esc(a.email)}</td><td class="text-center">${{ actif: '<span class="statut-badge statut-badge--present">Abonné·e</span>', a_confirmer: '<span class="statut-badge statut-badge--attente">À confirmer</span>', desabonne: '<span class="statut-badge statut-badge--annule">Désabonné·e</span>' }[a.statut]}</td><td class="td-muted">${fDateHeure(a.created_at)}</td></tr>`).join('') || '<tr><td colspan="3" class="vide">Personne pour l\'instant.</td></tr>'}
      </tbody></table></div></section>`;
  $('#btnGazette').onclick = () => editerGazette(null, gz);
  $$('[data-edit]', p).forEach(b => b.onclick = () => editerGazette(gz.find(g => g.id === b.dataset.edit), gz));
  $$('[data-send]', p).forEach(b => b.onclick = async () => {
    const g = gz.find(x => x.id === b.dataset.send);
    if (!confirm(`Envoyer la Gazette N°${g.numero} par e-mail à ${actifs.length} abonné·es ? (Une seule fois.)`)) return;
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
//  RÉGLAGES : objectif lutins, e-mail d'alerte, chiffres d'impact
// ═══════════════════════════════════════════════════════
async function chargerReglages() {
  const { data } = await sb.from('settings').select('*').in('key', ['objectif_lutins', 'email_admin', 'chiffres_impact']);
  const r = Object.fromEntries((data || []).map(x => [x.key, x.value]));
  let chiffres = []; try { chiffres = JSON.parse(r.chiffres_impact || '[]'); } catch (_) {}
  const box = $('#reglagesPlus');
  box.innerHTML = `
    <div class="settings"><h2 class="settings__title">Objectif des lutins de Noël</h2>
      <p class="settings__desc">Nombre de lettres d'enfants à parrainer cette année. Une jauge s'affiche alors sur la page « Aider » (lettres déjà demandées sur l'objectif). Vide = pas de jauge.</p>
      <div class="settings__row"><input type="number" class="input input--num" id="objLutins" min="1" value="${esc(r.objectif_lutins || '')}" placeholder="—"><span class="settings__unit">lettres</span><button class="btn btn--primary" data-cle="objectif_lutins" data-src="objLutins">Enregistrer</button></div></div>
    <div class="settings"><h2 class="settings__title">Adresse des alertes</h2>
      <p class="settings__desc">Reçoit un e-mail quand un·e bénévole confirme son inscription (à valider) ou se désiste.</p>
      <div class="settings__row"><input type="email" class="input" style="min-width:280px" id="emailAdmin" value="${esc(r.email_admin || '')}"><button class="btn btn--primary" data-cle="email_admin" data-src="emailAdmin">Enregistrer</button></div></div>
    <div class="settings"><h2 class="settings__title">Chiffres de la page « Notre impact »</h2>
      <p class="settings__desc">Un chiffre et sa légende par ligne. Ils s'affichent dans cet ordre.</p>
      <div id="chiffres">${chiffres.map(c => ligneChiffre(c)).join('')}</div>
      <div class="settings__row"><button class="btn btn--ghost" id="ajChiffre">+ Ajouter un chiffre</button><button class="btn btn--primary" id="saveChiffres">Enregistrer les chiffres</button></div></div>`;
  $$('[data-cle]', box).forEach(b => b.onclick = async () => {
    const val = $('#' + b.dataset.src).value.trim();
    const { error } = val ? await sb.from('settings').upsert({ key: b.dataset.cle, value: val }) : await sb.from('settings').delete().eq('key', b.dataset.cle);
    error ? erreur(error) : toast('Enregistré.');
  });
  $('#ajChiffre').onclick = () => $('#chiffres').insertAdjacentHTML('beforeend', ligneChiffre({ valeur: '', libelle: '' }));
  $('#chiffres').onclick = (e) => { if (e.target.dataset.suppr != null) e.target.closest('.chiffre').remove(); };
  $('#saveChiffres').onclick = async () => {
    const liste = $$('.chiffre', box).map(l => ({ valeur: $('[name=valeur]', l).value.trim(), libelle: $('[name=libelle]', l).value.trim() })).filter(c => c.valeur && c.libelle);
    const { error } = await sb.from('settings').upsert({ key: 'chiffres_impact', value: JSON.stringify(liste) });
    error ? erreur(error) : toast('Chiffres enregistrés.');
  };
}
const ligneChiffre = (c) => `<div class="chiffre settings__row"><input class="input input--num" name="valeur" value="${esc(c.valeur)}" placeholder="179"><input class="input" style="flex:1" name="libelle" value="${esc(c.libelle)}" placeholder="repas de Noël distribués en 2025"><button class="btn btn--ghost btn--sm" data-suppr type="button">Retirer</button></div>`;
