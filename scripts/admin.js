// ═══════════════════════════════════════════════════════
//  ECW Admin — dashboard
// ═══════════════════════════════════════════════════════

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── State ────────────────────────────────────────────────────────────────────
let allRows     = [];
let currentUser = null;

// ── Auth ─────────────────────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').hidden  = false;
  document.getElementById('dashboard').hidden    = true;
}

async function showDashboard() {
  document.getElementById('loginScreen').hidden  = true;
  document.getElementById('dashboard').hidden    = false;
  const { data } = await sb.auth.getUser();
  if (data?.user) currentUser = data.user;
  superAdmin = currentUser?.app_metadata?.role === 'super_admin';
  document.querySelector('.nav__item[data-tab="dons"]').hidden = !superAdmin;
  document.getElementById('navQui').textContent  = currentUser?.email ? `Connecté·e : ${currentUser.email}` : '';
  showTab(location.hash.slice(1));
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = document.getElementById('loginBtn');
  const error = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;

  btn.disabled    = true;
  btn.textContent = '…';
  error.textContent = '';

  const { data, error: err } = await sb.auth.signInWithPassword({ email, password: pass });

  if (err) {
    error.textContent = 'Email ou mot de passe incorrect.';
    btn.disabled    = false;
    btn.textContent = 'Connexion';
    return;
  }

  currentUser = data.user;
  btn.disabled = false; btn.textContent = 'Se connecter';
  showDashboard();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  superAdmin = false; document.querySelector('.nav__item[data-tab="dons"]').hidden = true;
  showLogin();
});

// ── Data ──────────────────────────────────────────────────────────────────────
async function loadInscriptions() {
  setLoading(true);

  const { data, error } = await sb
    .from('inscriptions_etudiantes')
    .select('*')
    .order('created_at', { ascending: false });

  setLoading(false);

  if (error) {
    console.error(error);
    return;
  }

  allRows = data ?? [];
  populateDateFilter();
  renderTable();
  updateStats();
}

function populateDateFilter() {
  const select = document.getElementById('filterDate');
  const dates  = [...new Set(allRows.map(r => r.date_rdv))].sort().reverse();

  // Keep "Toutes les dates" option
  select.innerHTML = '<option value="">Toutes les dates</option>';
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d;
    opt.textContent = d;
    select.appendChild(opt);
  });

  // Auto-sélectionner le prochain jeudi si disponible
  const next = getNextFirstThursdayStr();
  if (dates.includes(next)) select.value = next;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable() {
  const dateFilter   = document.getElementById('filterDate').value;
  const statutFilter = document.getElementById('filterStatut').value;
  const texte = sansAccents(document.getElementById('filterTexte').value.trim());

  const filtered = allRows.filter(r => {
    if (dateFilter   && r.date_rdv !== dateFilter)     return false;
    if (statutFilter && r.statut   !== statutFilter)   return false;
    if (texte && !sansAccents([r.prenom, r.nom, r.email, r.telephone, r.universite].join(' ')).includes(texte)) return false;
    return true;
  });

  const tbody = document.getElementById('inscriptionsBody');
  const empty = document.getElementById('adminEmpty');

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  filtered.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    tr.innerHTML = `
      <td class="td-name">${esc(row.prenom)} ${esc(row.nom)}</td>
      <td>${esc(row.universite)}</td>
      <td class="text-center">${row.nb_personnes}</td>
      <td class="td-muted"><a href="tel:${esc(row.telephone)}" style="color:inherit;">${esc(row.telephone)}</a></td>
      <td class="td-muted"><a href="mailto:${esc(row.email)}" style="color:inherit;">${esc(row.email)}</a></td>
      <td class="td-muted">${formatDate(row.created_at)}</td>
      <td class="td-muted" style="white-space:nowrap;">${esc(row.date_rdv)}</td>
      <td class="text-center">${statutBadge(row.statut)}</td>
      <td class="text-center">
        <div class="action-btns">${row.statut === 'liste_attente'
          ? `<button class="action-btn action-btn--present" data-id="${row.id}" data-action="promouvoir">Donner une place</button>`
          : row.statut === 'annulé' ? '<span class="td-muted">—</span>'
          : `<button class="action-btn action-btn--present" data-id="${row.id}" data-action="présent">Présent</button>
          <button class="action-btn action-btn--absent"  data-id="${row.id}" data-action="absent">Absent</button>`}
          ${['confirmé', 'rappel_envoyé', 'liste_attente'].includes(row.statut) ? `<button class="action-btn" data-id="${row.id}" data-action="annuler">Annuler</button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  // Action buttons
  tbody.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => updateStatut(btn.dataset.id, btn.dataset.action));
  });
}

function updateStats() {
  // Remplacé par la carte « prochaine épicerie » (admin-plus.js), rafraîchie à chaque chargement
  if (typeof chargerHeroEtudiants === 'function') chargerHeroEtudiants();
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function updateStatut(id, statut) {
  if (statut === 'annuler') {
    const r = allRows.find(x => x.id === id);
    const v = await decision({ titre: `Annuler l'inscription de ${r.prenom} ${r.nom} ?`,
      points: [{ type: 'info', html: `À utiliser quand la personne vous a prévenu·e (appel, message) qu'elle ne viendra pas le <strong>${esc(r.date_rdv)}</strong>. Ce n'est pas une absence : elle pourra se réinscrire normalement.` },
        ...(r.statut === 'liste_attente' ? [] : [{ type: 'ok', html: 'Sa place passe automatiquement à la première personne de la liste d\'attente, qui reçoit un e-mail de confirmation.' }])],
      champs: [{ nom: 'prevenir', label: `Envoyer à ${r.prenom} un e-mail qui confirme l'annulation`, type: 'checkbox', defaut: true }],
      actions: [{ valeur: 'ok', label: 'Annuler l\'inscription', style: 'danger' }] });
    if (!v) return;
    try { const res = await api({ action: 'etudiant_annuler', id, prevenir: v.prevenir }); toast(`Inscription annulée.${res.promus ? ` ${res.promus > 1 ? `${res.promus} personnes ont reçu` : 'Une personne de la liste d\'attente a reçu'} sa place.` : ''}`); changement(); } catch (e) { erreur(e); }
    return;
  }
  if (statut === 'promouvoir') {
    const r = allRows.find(x => x.id === id);
    const ok = await decision({ titre: `Donner une place à ${r.prenom} ${r.nom} ?`,
      points: [{ type: 'info', html: `${esc(r.prenom)} passe de la liste d'attente aux inscrit·es confirmé·es pour le <strong>${esc(r.date_rdv)}</strong>, pour ${r.nb_personnes} personne${r.nb_personnes > 1 ? 's' : ''}. Un e-mail de confirmation part tout de suite, avec la date à ajouter à son agenda.` },
        { type: 'attention', html: 'La limite de places de ce jour-là peut alors être dépassée : c\'est vous qui décidez.' }],
      actions: [{ valeur: 'ok', label: 'Donner la place et envoyer l\'e-mail', style: 'primary' }] });
    if (!ok) return;
    const { error } = await sb.from('inscriptions_etudiantes').update({ statut: 'confirmé', depuis_attente: true, mail_confirmation_at: null }).eq('id', id);
    if (error) { console.error(error); return; }
    await sb.functions.invoke('ecw-api', { body: { action: 'etudiant_mail', id } });
    return loadInscriptions();
  }
  const { error } = await sb
    .from('inscriptions_etudiantes')
    .update({ statut })
    .eq('id', id);

  if (error) { console.error(error); return; }

  // Update local state
  const row = allRows.find(r => r.id === id);
  if (row) row.statut = statut;

  // Re-render only the changed row's badge + action area
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (tr) {
    tr.querySelector('td:nth-child(8)').innerHTML = statutBadge(statut);
  }

  updateStats();
}

// ── Export CSV ────────────────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  const dateFilter   = document.getElementById('filterDate').value;
  const statutFilter = document.getElementById('filterStatut').value;

  const rows = allRows.filter(r => {
    if (dateFilter   && r.date_rdv !== dateFilter)   return false;
    if (statutFilter && r.statut   !== statutFilter) return false;
    return true;
  });

  const header = ['Prénom','Nom','Genre','Email','Téléphone','Université','Nb personnes','Date RDV','Statut','Inscrit le'];
  const lines  = rows.map(r => [
    r.prenom, r.nom, r.genre, r.email, r.telephone,
    r.universite, r.nb_personnes, r.date_rdv, r.statut,
    formatDate(r.created_at)
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = [header.join(','), ...lines].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `inscriptions-ecw-${dateFilter || 'all'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Filters & refresh ─────────────────────────────────────────────────────────
document.getElementById('filterDate').addEventListener('change',   () => { renderTable(); updateStats(); });
document.getElementById('filterStatut').addEventListener('change', () => { renderTable(); });
document.getElementById('filterTexte').addEventListener('input', () => { renderTable(); });
const sansAccents = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
document.getElementById('refreshBtn').addEventListener('click',    () => loadInscriptions());

// ── Helpers ───────────────────────────────────────────────────────────────────
function setLoading(on) {
  document.getElementById('adminLoading').hidden = !on;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-BE', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function statutBadge(statut) {
  const map = {
    'confirmé':      ['confirme',  'Confirmé'],
    'rappel_envoyé': ['rappel',    'Rappel envoyé'],
    'présent':       ['present',   'Présent'],
    'absent':        ['absent',    'Absent'],
    'liste_attente': ['attente',   'Liste d\'attente'],
    'annulé':        ['annule',    'Annulé'],
  };
  const [cls, label] = map[statut] ?? ['confirme', statut];
  return `<span class="statut-badge statut-badge--${cls}">${label}</span>`;
}

// Prochaine épicerie étudiante (calculée par la base : exceptions et annulations comprises)
let prochaineEpicerie = '';
sb.rpc('epicerie_prochaine').then(({ data }) => { if (data) { prochaineEpicerie = data.libelle; if (allRows.length) { populateDateFilter(); renderTable(); updateStats(); } } });
function getNextFirstThursdayStr() { return prochaineEpicerie; }

function formatDateFr(date) {
  const mois = ['janvier','février','mars','avril','mai','juin',
                 'juillet','août','septembre','octobre','novembre','décembre'];
  return `Jeudi ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
}

// ── Navigation ────────────────────────────────────────────────────────────────
// Six rubriques ; les anciennes adresses (#dates, #agenda, #gazette… des e-mails et favoris) restent valables
const PANELS = { accueil: 'panelAccueil', etudiants: 'panelInscriptions', benevoles: 'panelBenevoles', lutins: 'panelLutins', site: 'panelSite', dons: 'panelDons', reglages: 'panelParametres' };
// Super-admin : rôle lu sur le serveur (app_metadata) ; le serveur le revérifie pour chaque donnée sensible
let superAdmin = false;
const ALIAS = { inscriptions: ['etudiants', 'etuListe'], dates: ['etudiants', 'etuMois'], agenda: ['site', 'panelAgenda'], besoins: ['site', 'panelBesoins'], gazette: ['site', 'panelGazette'], chiffres: ['site', 'panelChiffres'], parametres: ['reglages'] };
function showTab(cible) {
  let [target, seg] = ALIAS[cible] || [cible];
  if (!PANELS[target] || (target === 'dons' && !superAdmin)) target = 'accueil';
  document.querySelectorAll('.dash__tab').forEach(t => { const on = t.dataset.tab === target; t.classList.toggle('is-active', on); on ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'); });
  Object.entries(PANELS).forEach(([k, id]) => { const el = document.getElementById(id); if (el) el.hidden = k !== target; });
  if (target === 'reglages') loadSettings();
  if (target === 'lutins')    loadLutins();
  if (target === 'etudiants') loadInscriptions();
  window.dispatchEvent(new CustomEvent('ecw:onglet', { detail: target }));
  if (seg) window.dispatchEvent(new CustomEvent('ecw:segment', { detail: seg }));
  history.replaceState(null, '', target === 'accueil' ? location.pathname : '#' + (seg && ALIAS[cible] ? cible : target));
  window.scrollTo(0, 0);
}
document.querySelectorAll('.dash__tab').forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));

// ── Lutins ────────────────────────────────────────────────────────────────────
let lutinsRows = [];

async function loadLutins() {
  document.getElementById('lutinsLoading').hidden = false;

  const { data, error } = await sb
    .from('inscriptions_lutins')
    .select('*')
    .order('created_at', { ascending: false });

  document.getElementById('lutinsLoading').hidden = true;

  if (error) { console.error(error); return; }

  lutinsRows = data ?? [];
  renderLutins();
  updateLutinsStats();
}

function renderLutins() {
  const filter = document.getElementById('filterLutinStatut').value;

  const filtered = lutinsRows.filter(r => {
    if (!filter) return true;
    if (filter === 'a_envoyer')    return !r.lettre_envoyee;
    if (filter === 'a_confirmer')  return r.lettre_envoyee && !r.cadeau_confirme;
    if (filter === 'a_recuperer')  return r.cadeau_confirme && !r.cadeau_recu;
    if (filter === 'a_remettre')   return r.cadeau_recu && !r.cadeau_remis;
    if (filter === 'termine')      return r.lettre_envoyee && r.cadeau_confirme && r.cadeau_recu && r.cadeau_remis;
    return true;
  });

  const tbody = document.getElementById('lutinsBody');
  const empty = document.getElementById('lutinsEmpty');
  tbody.innerHTML = '';

  if (filtered.length === 0) { empty.hidden = false; return; }
  empty.hidden = true;

  filtered.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    const tel = row.telephone ? String(row.telephone).trim() : '';
    const email = row.email ? String(row.email).trim() : '';
    const waNumber = tel ? tel.replace(/[^\d+]/g, '').replace(/^\+/, '') : '';
    const contactHtml = [
      tel ? `<a href="tel:${esc(tel)}">${esc(tel)}${waNumber ? ` <span class="td-contact__wa" title="WhatsApp">· WA</span>` : ''}</a>` : '',
      email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '',
    ].filter(Boolean).join('');

    tr.innerHTML = `
      <td class="td-name">${esc(row.prenom)} ${esc(row.nom)}</td>
      <td class="td-contact">${contactHtml || '<span class="td-muted">—</span>'}</td>
      <td class="text-center"><strong>${row.nb_lettres}</strong></td>
      <td class="text-center">${toggleCell(row.id, 'lettre_envoyee', row.lettre_envoyee)}</td>
      <td class="text-center">${toggleCell(row.id, 'cadeau_confirme', row.cadeau_confirme)}</td>
      <td class="text-center">${toggleCell(row.id, 'cadeau_recu', row.cadeau_recu)}</td>
      <td class="text-center">${toggleCell(row.id, 'cadeau_remis', row.cadeau_remis)}</td>
      <td><input class="note-input" data-id="${row.id}" type="text" value="${esc(row.notes || '')}" placeholder="Ajouter une note…"></td>
      <td class="td-muted">${formatDate(row.created_at)}</td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.toggle-cell').forEach(btn => {
    btn.addEventListener('click', () => toggleLutinFlag(btn.dataset.id, btn.dataset.field));
  });
  tbody.querySelectorAll('.note-input').forEach(inp => {
    inp.addEventListener('blur', () => saveLutinNote(inp.dataset.id, inp));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  });
}

function toggleCell(id, field, on) {
  const check = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
  return `<button class="toggle-cell${on ? ' is-on' : ''}" data-id="${id}" data-field="${field}" aria-pressed="${on}" title="${on ? 'Cliquer pour décocher' : 'Cliquer pour cocher'}">${check}</button>`;
}

async function toggleLutinFlag(id, field) {
  const row = lutinsRows.find(r => r.id === id);
  if (!row) return;
  const newVal = !row[field];

  const btn = document.querySelector(`.toggle-cell[data-id="${id}"][data-field="${field}"]`);
  if (btn) btn.classList.toggle('is-on', newVal);

  const { error } = await sb
    .from('inscriptions_lutins')
    .update({ [field]: newVal })
    .eq('id', id);

  if (error) {
    console.error(error);
    if (btn) btn.classList.toggle('is-on', !newVal);
    return;
  }

  row[field] = newVal;
  updateLutinsStats();
}

async function saveLutinNote(id, input) {
  const row = lutinsRows.find(r => r.id === id);
  if (!row) return;
  const newVal = input.value;
  if (newVal === (row.notes || '')) return;

  input.classList.add('is-saving');
  const { error } = await sb
    .from('inscriptions_lutins')
    .update({ notes: newVal })
    .eq('id', id);
  input.classList.remove('is-saving');

  if (error) { console.error(error); input.value = row.notes || ''; return; }
  row.notes = newVal;
}

function updateLutinsStats() {
  const total   = lutinsRows.length;
  const lettres = lutinsRows.reduce((s, r) => s + (r.nb_lettres || 0), 0);
  const aEnvoyer = lutinsRows.filter(r => !r.lettre_envoyee).reduce((s, r) => s + (r.nb_lettres || 0), 0);
  const cadeauxRestants = lutinsRows.filter(r => r.cadeau_confirme && !r.cadeau_recu).reduce((s, r) => s + (r.nb_lettres || 0), 0);

  document.getElementById('statLutins').textContent          = total;
  document.getElementById('statLettresTotal').textContent    = lettres;
  document.getElementById('statLettresAEnvoyer').textContent = aEnvoyer;
  document.getElementById('statCadeauxRestants').textContent = cadeauxRestants;
}

document.getElementById('filterLutinStatut').addEventListener('change', renderLutins);
document.getElementById('refreshLutinsBtn').addEventListener('click', loadLutins);

document.getElementById('exportLutinsBtn').addEventListener('click', () => {
  const header = ['Prénom','Nom','Email','Téléphone','Nb lettres','Lettre envoyée','Cadeau confirmé','Cadeau reçu','Cadeau remis','Notes','Inscrit le'];
  const lines  = lutinsRows.map(r => [
    r.prenom, r.nom, r.email || '', r.telephone || '', r.nb_lettres,
    r.lettre_envoyee ? 'oui' : 'non',
    r.cadeau_confirme ? 'oui' : 'non',
    r.cadeau_recu ? 'oui' : 'non',
    r.cadeau_remis ? 'oui' : 'non',
    r.notes || '',
    formatDate(r.created_at)
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = [header.join(','), ...lines].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `lutins-ecw-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Paramètres ────────────────────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await sb.from('settings').select('value').eq('key', 'jours_inscription_max').maybeSingle();
  if (data) document.getElementById('settingJours').value = data.value;
}

document.getElementById('saveSettings').addEventListener('click', async () => {
  const val      = parseInt(document.getElementById('settingJours').value, 10);
  const feedback = document.getElementById('settingsFeedback');

  if (!val || val < 1) { feedback.textContent = 'Valeur invalide.'; feedback.style.color = '#a03030'; return; }

  const { error } = await sb.from('settings').upsert({ key: 'jours_inscription_max', value: String(val) });

  if (error) {
    feedback.textContent = 'Erreur lors de la sauvegarde.';
    feedback.style.color = '#a03030';
  } else {
    feedback.textContent = `Enregistré : les inscriptions s'ouvrent ${val} jour${val > 1 ? 's' : ''} avant chaque épicerie étudiante.`;
    feedback.style.color = '#1a6e40';
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
