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

function showDashboard() {
  document.getElementById('loginScreen').hidden  = true;
  document.getElementById('dashboard').hidden    = false;
  loadInscriptions();
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
  showDashboard();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
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

  const filtered = allRows.filter(r => {
    if (dateFilter   && r.date_rdv !== dateFilter)     return false;
    if (statutFilter && r.statut   !== statutFilter)   return false;
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
      <td class="td-muted">${esc(row.genre)}</td>
      <td>${esc(row.universite)}</td>
      <td class="text-center">${row.nb_personnes}</td>
      <td class="td-muted"><a href="tel:${esc(row.telephone)}" style="color:inherit;">${esc(row.telephone)}</a></td>
      <td class="td-muted"><a href="mailto:${esc(row.email)}" style="color:inherit;">${esc(row.email)}</a></td>
      <td class="td-muted">${formatDate(row.created_at)}</td>
      <td class="td-muted" style="white-space:nowrap;">${esc(row.date_rdv)}</td>
      <td class="text-center">${statutBadge(row.statut)}</td>
      <td class="text-center">
        <div class="action-btns">
          <button class="action-btn action-btn--present" data-id="${row.id}" data-action="présent" title="Marquer présent">✓ Présent</button>
          <button class="action-btn action-btn--absent"  data-id="${row.id}" data-action="absent"  title="Marquer absent">✗ Absent</button>
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
  const dateFilter = document.getElementById('filterDate').value || getNextFirstThursdayStr();
  const forDate    = allRows.filter(r => r.date_rdv === dateFilter);
  const nbInscrits = forDate.length;
  const nbPersonnes = forDate.reduce((sum, r) => sum + (r.nb_personnes || 1), 0);

  document.getElementById('statInscrits').textContent  = nbInscrits;
  document.getElementById('statPersonnes').textContent = nbPersonnes;
  document.getElementById('statDate').textContent      = dateFilter || getNextFirstThursdayStr();
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function updateStatut(id, statut) {
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
    tr.querySelector('td:nth-child(9)').innerHTML = statutBadge(statut);
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
  };
  const [cls, label] = map[statut] ?? ['confirme', statut];
  return `<span class="statut-badge statut-badge--${cls}">${label}</span>`;
}

function getNextFirstThursdayStr() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= 2; offset++) {
    const d   = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const dow = d.getDay();
    const thu = new Date(d.getFullYear(), d.getMonth(), 1 + (4 - dow + 7) % 7);
    if (thu >= today) return formatDateFr(thu);
  }
  return '';
}

function formatDateFr(date) {
  const mois = ['janvier','février','mars','avril','mai','juin',
                 'juillet','août','septembre','octobre','novembre','décembre'];
  return `Jeudi ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.dash__tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dash__tab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    const target = tab.dataset.tab;
    document.getElementById('panelInscriptions').hidden = target !== 'inscriptions';
    document.getElementById('panelLutins').hidden       = target !== 'lutins';
    document.getElementById('panelParametres').hidden   = target !== 'parametres';
    if (target === 'parametres') loadSettings();
    if (target === 'lutins')     loadLutins();
  });
});

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
  const { data } = await sb.from('settings').select('value').eq('key', 'jours_inscription_max').single();
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
    feedback.textContent = `✓ Enregistré — inscriptions ouvertes ${val} jour${val > 1 ? 's' : ''} avant chaque rendez-vous.`;
    feedback.style.color = '#1a6e40';
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
