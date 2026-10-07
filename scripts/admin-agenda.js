// ═══════════════════════════════════════════════════════
//  ECW Admin — tableau de bord : « à faire » et grand agenda
//  Tout ce qui a une date au même endroit : épicerie étudiante,
//  créneaux bénévoles, événements. Glisser un élément sur un autre
//  jour ouvre une fenêtre qui montre les conséquences avant d'agir.
//  S'appuie sur admin.js (sb, esc) et admin-plus.js (decision, api…)
// ═══════════════════════════════════════════════════════

const CAL = { mois: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(), voir: { epicerie: true, creneau: true, actu: true }, evs: [], parJour: {}, charge: false };
try { Object.assign(CAL.voir, JSON.parse(localStorage.getItem('ecw-cal-voir') || '{}')); } catch (_) {}
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const TYPES = { epicerie: 'Épicerie étudiante', creneau: 'Bénévoles', actu: 'Événements' };

window.addEventListener('ecw:onglet', (e) => { if (e.detail === 'accueil') chargerAccueil().catch(erreur); });
window.addEventListener('ecw:maj', () => { if (!$('#panelAccueil').hidden) chargerAccueil().catch(() => {}); if ($('.tiroir.is-on')) fermerTiroir(); });

async function chargerAccueil() {
  const p = $('#panelAccueil');
  if (!CAL.charge) {
    p.innerHTML = `
      <div class="dash__heading dash__heading--row"><h1 class="dash__title" id="bonjour"></h1>
        <div class="toolbar__right"><div class="ajouter"><button class="btn btn--primary" id="calAjouter" aria-haspopup="menu" aria-expanded="false">Ajouter</button>
          <div class="ajouter__menu" id="calAjouterMenu" role="menu" hidden>
            <button role="menuitem" data-aj="creneau"><b>Un créneau bénévole</b><span>Une date, un horaire et un nombre de places : il s'affiche sur le calendrier public.</span></button>
            <button role="menuitem" data-aj="serie"><b>Une série de créneaux</b><span>Plusieurs dates identiques d'un coup, chaque semaine ou chaque mois.</span></button>
            <button role="menuitem" data-aj="actu"><b>Un événement ou une nouvelle</b><span>Annoncé sur l'accueil et la page Agenda du site.</span></button>
          </div></div></div></div>
      <section id="aFaire" class="afaire" aria-label="À faire"></section>
      <section class="cal-a" aria-label="Agenda">
        <div class="cal-a__barre">
          <div class="cal-a__nav"><button class="cal-a__fl" id="calPrec" aria-label="Mois précédent">←</button><h2 id="calMoisTitre" aria-live="polite"></h2><button class="cal-a__fl" id="calSuiv" aria-label="Mois suivant">→</button><button class="btn btn--ghost btn--sm" id="calAuj">Aujourd'hui</button></div>
          <div class="cal-a__filtres" role="group" aria-label="Afficher">${Object.entries(TYPES).map(([k, l]) => `<label class="cal-a__filtre cal-a__filtre--${k}"><input type="checkbox" data-voir="${k}" ${CAL.voir[k] ? 'checked' : ''}><i></i>${l}</label>`).join('')}</div>
        </div>
        <p class="cal-a__aide">Glissez un élément sur un autre jour pour le déplacer : avant d'enregistrer, une fenêtre montre qui sera prévenu et ce qui pourrait poser problème. Cliquez sur un élément pour voir le détail et les personnes inscrites, ou sur un jour pour y ajouter quelque chose. Sur téléphone, appuyez longuement avant de glisser.</p>
        <div class="cal-a__grille" id="calGrille"></div>
      </section>`;
    $('#calPrec').onclick = () => { CAL.mois.setMonth(CAL.mois.getMonth() - 1); chargerCalendrier(); };
    $('#calSuiv').onclick = () => { CAL.mois.setMonth(CAL.mois.getMonth() + 1); chargerCalendrier(); };
    $('#calAuj').onclick = () => { const d = new Date(); CAL.mois = new Date(d.getFullYear(), d.getMonth(), 1); chargerCalendrier(); };
    $$('[data-voir]', p).forEach(c => c.onchange = () => { CAL.voir[c.dataset.voir] = c.checked; try { localStorage.setItem('ecw-cal-voir', JSON.stringify(CAL.voir)); } catch (_) {} rendreGrille(); });
    const menu = $('#calAjouterMenu'), bt = $('#calAjouter');
    bt.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; bt.setAttribute('aria-expanded', !menu.hidden); };
    document.addEventListener('click', () => { menu.hidden = true; bt.setAttribute('aria-expanded', 'false'); });
    menu.onclick = (e) => { const a = e.target.closest('[data-aj]')?.dataset.aj; if (a) ajouter(a); };
    brancherGlisser($('#calGrille'));
    CAL.charge = true;
  }
  const h = new Date().getHours();
  $('#bonjour').textContent = `${h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour'}, nous sommes ${jourMois(new Date())}`;
  await Promise.all([chargerCalendrier(), chargerAFaire()]);
}

function ajouter(type, iso) {
  const date = iso || (CAL.jourChoisi && CAL.jourChoisi >= auj() ? CAL.jourChoisi : '');
  if (type === 'creneau') editerCreneau(null, date ? { date } : {});
  if (type === 'serie') creerSerie(date ? { date } : {});
  if (type === 'actu') editerActu(null, date ? { date_evenement: date, publie: true } : { publie: true });
}

// ── À faire : seulement ce qui demande une action ───────────────────────────
async function chargerAFaire() {
  const box = $('#aFaire');
  const dans10 = new Date(Date.now() + 10 * 864e5).toISOString();
  const [{ data: aValider }, { data: P }, { data: proches }, { data: gz }, { count: abonnes }, { data: lutins }] = await Promise.all([
    sb.from('benevole_inscriptions').select('id, prenom, nom, creneau_id').eq('statut', 'confirme'),
    sb.rpc('epicerie_prochaine'),
    sb.from('benevole_creneaux').select('id, debut, fin, places, categorie_id, publie').gte('debut', new Date().toISOString()).lt('debut', dans10).order('debut'),
    sb.from('gazettes').select('id, numero, titre, publie, envoyee_at').eq('publie', true).is('envoyee_at', null),
    sb.from('abonnes_gazette').select('id', { count: 'exact', head: true }).eq('statut', 'actif'),
    sb.from('inscriptions_lutins').select('nb_lettres, lettre_envoyee, cadeau_confirme, cadeau_recu'),
  ]);
  await assurerCats();
  const cartes = [];
  if (aValider?.length) cartes.push({ ton: 'alerte', n: aValider.length, texte: `${aValider.length > 1 ? 'bénévoles attendent' : 'bénévole attend'} votre validation : ${aValider.slice(0, 3).map(i => `${esc(i.prenom)} ${esc(i.nom)}`).join(', ')}${aValider.length > 3 ? '…' : ''}. Tant que ce n'est pas fait, ${aValider.length > 1 ? 'elles et ils ne savent' : 'la personne ne sait'} pas si ${aValider.length > 1 ? 'leur venue est' : 'sa venue est'} confirmée.`, bouton: 'Valider', aller: 'benevoles' });
  if (P && dansJours(P.date) <= 7) cartes.push({ ton: 'teal', n: P.inscrits, texte: `${P.inscrits > 1 ? 'personnes inscrites' : 'personne inscrite'} à l'épicerie étudiante ${quandRelatif(P.date) === 'demain' ? 'de demain' : `du ${jourMois(dateDe(P.date))}`}${P.capacite ? ` sur ${P.capacite} places` : ''}${P.attente ? `, et ${P.attente} en liste d'attente` : ''}. ${P.ouverture > auj() ? `Les inscriptions ouvrent le ${jourMois(dateDe(P.ouverture))}.` : 'Le rappel part automatiquement la veille au matin.'}`, bouton: 'Voir la liste', aller: 'etudiants' });
  const ids = (proches || []).map(c => c.id);
  if (ids.length) {
    const { data: ins } = await sb.from('benevole_inscriptions').select('creneau_id, statut, created_at').in('creneau_id', ids);
    const pris = (id) => (ins || []).filter(i => i.creneau_id === id && (['confirme', 'valide'].includes(i.statut) || (i.statut === 'a_confirmer' && Date.now() - Date.parse(i.created_at) < 48 * 3600e3))).length;
    const manque = proches.filter(c => c.publie && pris(c.id) < c.places);
    if (manque.length) cartes.push({ ton: 'or', n: manque.length, texte: `${manque.length > 1 ? 'créneaux des 10 prochains jours manquent' : 'créneau des 10 prochains jours manque'} encore de bénévoles. Partager le lien du calendrier dans le groupe des bénévoles aide souvent.<span class="afaire__liste">${manque.slice(0, 5).map(c => `<button class="lien-cr" data-ouvrir="creneau:${c.id}" style="--c:${COULEURS[catDe(c.categorie_id).couleur]}"><b>${esc(catDe(c.categorie_id).nom)}</b> ${jourMois(new Date(c.debut))} <em>${pris(c.id)}/${c.places}</em></button>`).join('')}</span>`, bouton: 'Copier le lien du calendrier', copier: `${location.origin}/benevoles/` });
  }
  (gz || []).forEach(g => abonnes && cartes.push({ ton: 'navy', n: abonnes, texte: `${abonnes > 1 ? 'abonné·es n\'ont' : 'abonné·e n\'a'} pas encore reçu la Gazette N°${g.numero} (${esc(g.titre)}), pourtant en ligne. L'envoi part en un clic, une seule fois.`, bouton: 'Envoyer la Gazette', aller: 'gazette' }));
  const m = new Date().getMonth();
  if ((m >= 9 || m === 0) && lutins?.length) {
    const aEnvoyer = lutins.filter(l => !l.lettre_envoyee).reduce((a, l) => a + l.nb_lettres, 0);
    if (aEnvoyer) cartes.push({ ton: 'coral', n: aEnvoyer, texte: `${aEnvoyer > 1 ? 'lettres d\'enfants restent' : 'lettre d\'enfant reste'} à envoyer aux lutin·es de Noël. Plus elles partent tôt, plus les cadeaux arrivent à temps.`, bouton: 'Voir les lutins', aller: 'lutins' });
  }
  box.innerHTML = cartes.length
    ? `<h2 class="afaire__t">À faire</h2><div class="afaire__grille">${cartes.map((c, k) => `<article class="afaire__c afaire__c--${c.ton}"><b class="afaire__n">${c.n}</b><p>${c.texte}</p><button class="btn btn--sm ${c.ton === 'alerte' ? 'btn--primary' : 'btn--ghost'}" data-k="${k}">${c.bouton}</button></article>`).join('')}</div>`
    : '<div class="afaire__rien"><b>Tout est à jour.</b> Aucune inscription n\'attend de validation, les créneaux des prochains jours sont complets et la dernière Gazette est partie.</div>';
  box.onclick = async (e) => {
    const o = e.target.closest('[data-ouvrir]'); if (o) { const [t, id] = o.dataset.ouvrir.split(':'); return ouvrirElement(t, id); }
    const b = e.target.closest('[data-k]'); if (!b) return; const c = cartes[b.dataset.k];
    if (c.aller) showTab(c.aller);
    if (c.copier) { try { await navigator.clipboard.writeText(c.copier); toast('Lien copié : collez-le dans le groupe des bénévoles.'); } catch (_) { toast(c.copier); } }
  };
}

// ── Données du mois affiché (avec les jours débordants des semaines) ─────────
async function chargerCalendrier() {
  const debut = new Date(CAL.mois); debut.setDate(1 - ((debut.getDay() + 6) % 7));
  const fin = new Date(debut); fin.setDate(fin.getDate() + 42);
  CAL.debut = debut; CAL.fin = fin;
  $('#calMoisTitre').textContent = `${majusc(MOIS[CAL.mois.getMonth()])} ${CAL.mois.getFullYear()}`;
  const d0 = isoLocal(debut).date, d1 = isoLocal(fin).date;
  const clesMois = [...new Set([0, 1, 2].map(i => cleMois(new Date(debut.getFullYear(), debut.getMonth() + i, 1))))];
  await assurerCats();
  const [{ data: creneaux }, { data: actus }, { data: lignesMois }, capReg] = await Promise.all([
    sb.from('benevole_creneaux').select('*').gte('debut', debut.toISOString()).lt('debut', fin.toISOString()).order('debut'),
    sb.from('actus').select('*').gte('date_evenement', d0).lt('date_evenement', d1),
    sb.from('epicerie_mois').select('*').in('mois', clesMois),
    reglage('capacite_etudiants'),
  ]);
  const ids = (creneaux || []).map(c => c.id);
  const epiceries = clesMois.map(cle => { const l = (lignesMois || []).find(x => x.mois === cle); const jour = l?.jour ? dateDe(l.jour) : premierJeudiDe(cle); return { cle, l, jour, iso: isoLocal(jour).date, lib: libelleDate(jour), cap: l?.capacite ?? (capReg ? Number(capReg) : null) }; }).filter(e => e.iso >= d0 && e.iso < d1);
  const [{ data: ins }, { data: etu }] = await Promise.all([
    ids.length ? sb.from('benevole_inscriptions').select('id, creneau_id, prenom, nom, statut, created_at').in('creneau_id', ids) : { data: [] },
    epiceries.length ? sb.from('inscriptions_etudiantes').select('date_rdv, nb_personnes, statut').in('date_rdv', epiceries.map(e => e.lib)).in('statut', ACTIFS_ETU) : { data: [] },
  ]);
  const evs = [];
  for (const e of epiceries) {
    const lignes = (etu || []).filter(r => r.date_rdv === e.lib);
    evs.push({ type: 'epicerie', id: e.cle, iso: e.iso, tri: '16', e, annule: !!e.l?.annule, pris: lignes.filter(r => r.statut !== 'liste_attente').reduce((a, r) => a + r.nb_personnes, 0), attente: lignes.filter(r => r.statut === 'liste_attente').length });
  }
  for (const c of creneaux || []) {
    const lesIns = (ins || []).filter(i => i.creneau_id === c.id);
    const pris = lesIns.filter(i => ['confirme', 'valide'].includes(i.statut) || (i.statut === 'a_confirmer' && Date.now() - Date.parse(i.created_at) < 48 * 3600e3)).length;
    evs.push({ type: 'creneau', id: c.id, iso: isoLocal(c.debut).date, tri: isoLocal(c.debut).heure, c, k: catDe(c.categorie_id), pris, aValider: lesIns.filter(i => i.statut === 'confirme').length, ins: lesIns });
  }
  for (const a of actus || []) evs.push({ type: 'actu', id: a.id, iso: a.date_evenement, tri: (a.heure || '').replace(/\D/g, '').padStart(4, '0') || '99', a });
  evs.sort((x, y) => x.iso.localeCompare(y.iso) || String(x.tri).localeCompare(String(y.tri)));
  CAL.evs = evs;
  rendreGrille();
}

function puce(ev) {
  const passe = ev.iso < auj();
  const glisse = !passe && !(ev.type === 'epicerie' && ev.annule) ? 'data-glisse="1"' : '';
  const base = `class="ev ev--${ev.type} ${passe ? 'is-passe' : ''}" data-ev="${ev.type}:${ev.id}" ${glisse} tabindex="0" role="button"`;
  if (ev.type === 'epicerie') {
    if (ev.annule) return `<div ${base.replace('ev--epicerie', 'ev--epicerie is-annule')} aria-label="Épicerie étudiante annulée"><span class="ev__t">Épicerie étudiante</span><span class="ev__m">annulée</span></div>`;
    const plein = ev.e.cap && ev.pris >= ev.e.cap;
    return `<div ${base} aria-label="Épicerie étudiante, ${ev.pris} personnes inscrites"><span class="ev__t">Épicerie étudiante</span><span class="ev__m">${ev.pris}${ev.e.cap ? `/${ev.e.cap}` : ''} pers.${ev.attente ? ` · +${ev.attente} en attente` : ''}${plein ? ' · complet' : ''}</span></div>`;
  }
  if (ev.type === 'creneau') {
    const etat = ev.aValider ? '<i class="ev__pastille" title="Inscription à valider"></i>' : '';
    const complet = ev.pris >= ev.c.places;
    return `<div ${base} style="--c:${COULEURS[ev.k.couleur]}" aria-label="${esc(ev.k.nom)}, ${fHeure(ev.c.debut)}, ${ev.pris} sur ${ev.c.places}"><span class="ev__t">${etat}${esc(ev.k.nom)}</span><span class="ev__m">${fHeure(ev.c.debut)}–${fHeure(ev.c.fin)} · <b class="${complet ? 'ok' : ev.pris === 0 && !passe ? 'vide' : ''}">${ev.pris}/${ev.c.places}</b>${ev.c.publie ? '' : ' · caché'}</span></div>`;
  }
  return `<div ${base} aria-label="Événement : ${esc(ev.a.titre)}"><span class="ev__t">${esc(ev.a.titre)}</span>${ev.a.heure ? `<span class="ev__m">${esc(ev.a.heure)}</span>` : ''}</div>`;
}

function rendreGrille() {
  const g = $('#calGrille'); if (!g) return;
  const parJour = {};
  CAL.evs.filter(e => CAL.voir[e.type]).forEach(e => (parJour[e.iso] ||= []).push(e));
  CAL.parJour = parJour;
  const today = auj(); let html = `<div class="cal-a__tete" aria-hidden="true">${JOURS_COURTS.map(j => `<span>${j}</span>`).join('')}</div><div class="cal-a__cases">`;
  for (let i = 0; i < 42; i++) {
    const d = new Date(CAL.debut); d.setDate(d.getDate() + i); const iso = isoLocal(d).date;
    const liste = parJour[iso] || []; const hors = d.getMonth() !== CAL.mois.getMonth();
    const max = 3;
    html += `<div class="cal-j ${hors ? 'is-hors' : ''} ${iso === today ? 'is-auj' : ''} ${iso < today ? 'is-passe' : ''} ${CAL.jourChoisi === iso ? 'is-choisi' : ''}" data-date="${iso}" aria-label="${jourMois(d)}${liste.length ? `, ${liste.length} élément${liste.length > 1 ? 's' : ''}` : ''}">
      <button class="cal-j__n" data-jour="${iso}" aria-label="Ouvrir le ${jourMois(d)}">${d.getDate()}</button>
      <div class="cal-j__evs">${liste.slice(0, max).map(puce).join('')}${liste.length > max ? `<button class="cal-j__plus" data-jour="${iso}">+${liste.length - max} autre${liste.length - max > 1 ? 's' : ''}</button>` : ''}</div>
      <div class="cal-j__pts" aria-hidden="true">${liste.slice(0, 4).map(e => `<i style="--c:${e.type === 'creneau' ? COULEURS[e.k.couleur] : e.type === 'epicerie' ? COULEURS.teal : COULEURS.coral}"></i>`).join('')}</div>
    </div>`;
  }
  g.innerHTML = html + '</div>';
}

// ── Clics : élément → détail ; jour → liste et ajout ──────────────────────────
document.addEventListener('click', (e) => {
  const g = e.target.closest('#calGrille'); if (!g || CAL.vientDeGlisser) return;
  const ev = e.target.closest('[data-ev]');
  if (ev && !window.matchMedia('(max-width: 760px)').matches) { const [t, id] = ev.dataset.ev.split(':'); return ouvrirElement(t, id); }
  const j = e.target.closest('[data-jour]') || e.target.closest('.cal-j');
  if (j) ouvrirJour(j.dataset.jour || j.dataset.date);
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('#calGrille [data-ev]')) { e.preventDefault(); const [t, id] = e.target.dataset.ev.split(':'); ouvrirElement(t, id); }
  if (e.key === 'Escape' && $('.tiroir.is-on') && !$('dialog[open]')) fermerTiroir();
});

// ── Tiroir latéral ────────────────────────────────────────────────────────────
function ouvrirTiroir(html, brancher) {
  let t = $('#tiroir');
  if (!t) {
    document.body.insertAdjacentHTML('beforeend', '<div class="tiroir__voile" id="tiroirVoile"></div><aside class="tiroir" id="tiroir" role="dialog" aria-modal="true" aria-labelledby="tiroirTitre" tabindex="-1"></aside>');
    t = $('#tiroir'); $('#tiroirVoile').onclick = fermerTiroir;
  }
  t.innerHTML = `<button class="tiroir__x" aria-label="Fermer">×</button>${html}`;
  $('.tiroir__x', t).onclick = fermerTiroir;
  t.classList.add('is-on'); $('#tiroirVoile').classList.add('is-on'); document.body.classList.add('tiroir-ouvert');
  brancher?.(t); t.focus();
}
function fermerTiroir() { $('#tiroir')?.classList.remove('is-on'); $('#tiroirVoile')?.classList.remove('is-on'); document.body.classList.remove('tiroir-ouvert'); }

function ouvrirJour(iso) {
  CAL.jourChoisi = iso; $$('.cal-j.is-choisi').forEach(c => c.classList.remove('is-choisi')); $(`.cal-j[data-date="${iso}"]`)?.classList.add('is-choisi');
  const liste = CAL.parJour[iso] || []; const d = dateDe(iso); const passe = iso < auj();
  ouvrirTiroir(`<p class="tiroir__k">${quandRelatif(iso)}</p><h2 id="tiroirTitre" class="tiroir__t">${majusc(jourMois(d))}</h2>
    ${liste.length ? `<div class="tiroir__liste">${liste.map(e => `<button class="tl tl--${e.type}" data-ouvrir="${e.type}:${e.id}" ${e.type === 'creneau' ? `style="--c:${COULEURS[e.k.couleur]}"` : ''}>${puceTexte(e)}</button>`).join('')}</div>` : `<p class="tiroir__vide">${passe ? 'Rien ce jour-là.' : 'Rien de prévu ce jour-là pour l\'instant.'}</p>`}
    ${passe ? '' : `<div class="tiroir__ajout"><h3>Ajouter ce jour-là</h3><button class="btn btn--ghost" data-aj="creneau">Un créneau bénévole</button><button class="btn btn--ghost" data-aj="actu">Un événement</button></div>`}`,
    (t) => t.onclick = (e) => { const o = e.target.closest('[data-ouvrir]'); if (o) { const [ty, id] = o.dataset.ouvrir.split(':'); ouvrirElement(ty, id); } const a = e.target.closest('[data-aj]'); if (a) { fermerTiroir(); ajouter(a.dataset.aj, iso); } });
}
function puceTexte(e) {
  if (e.type === 'epicerie') return `<b>Épicerie étudiante${e.annule ? ' (annulée)' : ''}</b><span>${e.annule ? 'N\'a pas lieu ce mois-ci' : `${e.pris}${e.e.cap ? ` sur ${e.e.cap}` : ''} personnes inscrites${e.attente ? `, ${e.attente} en attente` : ''}`}</span>`;
  if (e.type === 'creneau') return `<b>${esc(e.k.nom)}</b><span>${fHeure(e.c.debut)} – ${fHeure(e.c.fin)} · ${e.pris} sur ${e.c.places} bénévoles${e.aValider ? ` · ${e.aValider} à valider` : ''}</span>`;
  return `<b>${esc(e.a.titre)}</b><span>${[e.a.heure, e.a.lieu].filter(Boolean).map(esc).join(' · ') || 'Événement'}</span>`;
}

async function ouvrirElement(type, id) {
  const ev = CAL.evs.find(e => e.type === type && String(e.id) === String(id));
  if (type === 'creneau') return tiroirCreneau(ev?.c || (await sb.from('benevole_creneaux').select('*').eq('id', id).single()).data);
  if (type === 'epicerie') return tiroirEpicerie(id);
  if (type === 'actu') return tiroirActu(ev?.a || (await sb.from('actus').select('*').eq('id', id).single()).data);
}

async function tiroirCreneau(c) {
  await assurerCats();
  const k = catDe(c.categorie_id);
  const { data: ins } = await sb.from('benevole_inscriptions').select('*').eq('creneau_id', c.id).order('created_at');
  const actifs = (ins || []).filter(i => ['a_confirmer', 'confirme', 'valide'].includes(i.statut));
  const pris = actifs.filter(i => i.statut !== 'a_confirmer' || Date.now() - Date.parse(i.created_at) < 48 * 3600e3).length;
  const passe = Date.parse(c.debut) < Date.now();
  const pct = Math.min(100, Math.round(pris / c.places * 100));
  ouvrirTiroir(`<div class="tiroir__bande" style="--c:${COULEURS[k.couleur]}"></div>
    <p class="tiroir__k">${quandRelatif(isoLocal(c.debut).date)}${c.publie ? '' : ' · caché du calendrier public'}</p>
    <h2 id="tiroirTitre" class="tiroir__t">${esc(k.nom)}</h2>
    <p class="tiroir__quand">${horaire(c.debut, c.fin)}</p>
    ${c.note ? `<p class="tiroir__note">${esc(c.note)}</p>` : ''}
    <div class="jauge-a ${pris >= c.places ? 'is-plein' : ''}" style="--c:${COULEURS[k.couleur]}"><span style="width:${pct}%"></span></div>
    <p class="tiroir__chiffre"><strong>${pris} sur ${c.places}</strong> ${pris >= c.places ? 'places prises : le créneau est complet sur le site.' : `places prises : il manque encore ${c.places - pris} bénévole${c.places - pris > 1 ? 's' : ''}.`}</p>
    <h3 class="tiroir__h">Bénévoles</h3>
    ${(ins || []).length ? `<ul class="gens-liste">${ins.map(i => `<li class="gl gl--${i.statut}">
      <div class="gl__h"><strong>${esc(i.prenom)} ${esc(i.nom)}</strong>${badgeBen(i.statut)}${i.presence === 'oui' ? '<span class="gl__ok">a confirmé sa présence</span>' : ''}</div>
      <p class="gl__c"><a href="mailto:${esc(i.email)}">${esc(i.email)}</a>${tel(i.telephone)}</p>
      ${i.message ? `<p class="gl__m">«&nbsp;${esc(i.message)}&nbsp;»</p>` : ''}
      ${!passe && ['confirme', 'a_confirmer'].includes(i.statut) ? `<div class="gl__a"><button class="btn btn--primary btn--sm" data-dec="valide" data-id="${i.id}">Valider</button><button class="btn btn--ghost btn--sm" data-dec="refuse" data-id="${i.id}">Refuser</button></div>` : ''}
      ${!passe && i.statut === 'valide' ? `<div class="gl__a"><button class="btn btn--ghost btn--sm" data-dec="refuse" data-id="${i.id}">Retirer de ce créneau</button></div>` : ''}
    </li>`).join('')}</ul>` : '<p class="tiroir__vide">Personne pour l\'instant. Le créneau est ouvert aux inscriptions sur le calendrier public.</p>'}
    <div class="tiroir__a">${passe ? '' : '<button class="btn btn--primary" data-t="edit">Modifier</button>'}<button class="btn btn--ghost" data-t="dup">Copier la semaine suivante</button>${passe ? '' : '<button class="btn btn--ghost btn--rouge" data-t="suppr">Supprimer</button>'}</div>`,
    (t) => t.onclick = (e) => {
      const d = e.target.closest('[data-dec]'); if (d) return decider(d.dataset.id, d.dataset.dec);
      const a = e.target.closest('[data-t]')?.dataset.t; if (!a) return;
      ({ edit: editerCreneau, dup: dupliquer, suppr: supprimerCreneau })[a](c);
    });
}

async function tiroirEpicerie(cle) {
  const E = await lireEpicerie(cle);
  const pris = personnes(E.confirmes); const passe = E.iso < auj();
  const pct = E.cap ? Math.min(100, Math.round(pris / E.cap * 100)) : 0;
  const ligne = (i) => `<li class="gl"><div class="gl__h"><strong>${esc(i.prenom)} ${esc(i.nom)}</strong><span class="gl__nb">${i.nb_personnes} pers.</span></div><p class="gl__c"><a href="mailto:${esc(i.email)}">${esc(i.email)}</a>${tel(i.telephone)}</p></li>`;
  ouvrirTiroir(`<div class="tiroir__bande" style="--c:${COULEURS.teal}"></div>
    <p class="tiroir__k">${quandRelatif(E.iso)}${E.ligne?.jour ? ' · date changée' : ''}</p>
    <h2 id="tiroirTitre" class="tiroir__t">Épicerie étudiante</h2>
    <p class="tiroir__quand">${majusc(jourMois(E.jour))}</p>
    ${E.annule ? '<p class="tiroir__note tiroir__note--rouge">Annulée : le site annonce directement la date suivante.</p>' : `
    ${E.ligne?.note ? `<p class="tiroir__note">${esc(E.ligne.note)}</p>` : ''}
    ${E.cap ? `<div class="jauge-a ${pct >= 100 ? 'is-plein' : ''}" style="--c:${COULEURS.teal}"><span style="width:${pct}%"></span></div>` : ''}
    <p class="tiroir__chiffre"><strong>${pluriel(pris, 'personne inscrite', 'personnes inscrites')}</strong>${E.cap ? ` sur ${E.cap} places.` : ', sans limite de places.'}</p>
    <h3 class="tiroir__h">Inscrit·es</h3>${E.confirmes.length ? `<ul class="gens-liste">${E.confirmes.map(ligne).join('')}</ul>` : '<p class="tiroir__vide">Personne pour l\'instant.</p>'}
    ${E.attente.length ? `<h3 class="tiroir__h">Liste d'attente</h3><ul class="gens-liste">${E.attente.map(ligne).join('')}</ul>` : ''}`}
    <div class="tiroir__a">${passe ? '' : E.annule ? '<button class="btn btn--primary" data-t="retablir">Rétablir ce mois</button>' : '<button class="btn btn--primary" data-t="date">Changer la date</button><button class="btn btn--ghost" data-t="places">Nombre de places</button><button class="btn btn--ghost btn--rouge" data-t="annuler">Annuler ce mois</button>'}<button class="btn btn--ghost" data-t="liste">Toutes les inscriptions</button></div>`,
    (t) => t.onclick = (e) => { const a = e.target.closest('[data-t]')?.dataset.t; if (!a) return;
      if (a === 'liste') { fermerTiroir(); return showTab('inscriptions'); }
      ({ date: choisirDateEpicerie, places: placesEpicerie, annuler: annulerEpicerie, retablir: retablirEpicerie })[a](cle); });
}

function tiroirActu(a) {
  ouvrirTiroir(`<div class="tiroir__bande" style="--c:${COULEURS.coral}"></div>
    <p class="tiroir__k">${quandRelatif(a.date_evenement)}${a.publie ? '' : ' · caché du site'}</p>
    <h2 id="tiroirTitre" class="tiroir__t">${esc(a.titre)}</h2>
    <p class="tiroir__quand">${majusc(jourMois(dateDe(a.date_evenement)))}${a.heure ? `, ${esc(a.heure)}` : ''}${a.lieu ? ` · ${esc(a.lieu)}` : ''}</p>
    ${a.texte ? `<p class="tiroir__texte">${esc(a.texte)}</p>` : ''}
    ${a.lien_url ? `<p class="tiroir__texte"><a href="${esc(a.lien_url)}" target="_blank" rel="noopener">${esc(a.lien_label || a.lien_url)}</a></p>` : ''}
    <p class="tiroir__vide">${a.publie ? 'Annoncé sur l\'accueil (parmi les trois prochains événements) et sur la page Agenda.' : 'Caché : cet événement n\'apparaît pas sur le site.'}</p>
    <div class="tiroir__a"><button class="btn btn--primary" data-t="edit">Modifier</button><button class="btn btn--ghost btn--rouge" data-t="suppr">Supprimer</button></div>`,
    (t) => t.onclick = (e) => { const x = e.target.closest('[data-t]')?.dataset.t; if (x === 'edit') editerActu(a); if (x === 'suppr') supprimerActu(a); });
}

// ── Glisser-déposer (souris : tout de suite ; doigt : appui long) ─────────────
function brancherGlisser(grille) {
  let etat = null;
  const stopTouch = (e) => { if (etat?.actif) e.preventDefault(); };
  document.addEventListener('touchmove', stopTouch, { passive: false });
  grille.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-glisse]')) e.preventDefault(); });

  grille.addEventListener('pointerdown', (e) => {
    const puce = e.target.closest('[data-glisse]'); if (!puce || e.button > 0) return;
    etat = { puce, x: e.clientX, y: e.clientY, id: e.pointerId, actif: false, tactile: e.pointerType !== 'mouse' };
    if (!etat.tactile) e.preventDefault();   // pas de sélection de texte pendant le geste
    if (etat.tactile) etat.minuteur = setTimeout(() => commencer(e.clientX, e.clientY), 380);
  });
  const commencer = (x, y) => {
    if (!etat) return;
    etat.actif = true; navigator.vibrate?.(15);
    const r = etat.puce.getBoundingClientRect();
    const fantome = etat.puce.cloneNode(true); fantome.className += ' ev--fantome'; fantome.style.width = r.width + 'px';
    etat.dx = x - r.left; etat.dy = y - r.top; etat.fantome = fantome; document.body.appendChild(fantome);
    etat.puce.classList.add('is-source'); document.body.classList.add('glisse-en-cours');
    placer(x, y);
  };
  const placer = (x, y) => {
    etat.fantome.style.transform = `translate(${x - etat.dx}px, ${y - etat.dy}px) rotate(-2deg)`;
    const cible = document.elementFromPoint(x, y)?.closest('.cal-j');
    if (cible !== etat.cible) { etat.cible?.classList.remove('is-cible'); cible?.classList.add('is-cible'); etat.cible = cible; }
    // défilement automatique près des bords
    if (y < 70) window.scrollBy(0, -12); else if (y > innerHeight - 70) window.scrollBy(0, 12);
  };
  document.addEventListener('pointermove', (e) => {
    if (!etat || e.pointerId !== etat.id) return;
    const loin = Math.hypot(e.clientX - etat.x, e.clientY - etat.y) > 6;
    if (!etat.actif) { if (etat.tactile) { if (loin) { clearTimeout(etat.minuteur); etat = null; } return; } if (loin) commencer(e.clientX, e.clientY); else return; }
    placer(e.clientX, e.clientY);
  });
  const finir = async (e, annule) => {
    if (!etat || e.pointerId !== etat.id) return;
    clearTimeout(etat.minuteur);
    const { actif, cible, puce, fantome } = etat; etat = null;
    if (!actif) return;
    fantome.remove(); puce.classList.remove('is-source'); cible?.classList.remove('is-cible'); document.body.classList.remove('glisse-en-cours');
    CAL.vientDeGlisser = true; setTimeout(() => { CAL.vientDeGlisser = false; }, 50);
    if (annule || !cible) return;
    const [type, id] = puce.dataset.ev.split(':'); const iso = cible.dataset.date;
    await deposer(type, id, iso);
  };
  document.addEventListener('pointerup', (e) => finir(e, false));
  document.addEventListener('pointercancel', (e) => finir(e, true));
}

// Ce qui se passe déjà ce jour-là : utile pour décider
function contexteDuJour(iso, sauf) {
  return (CAL.parJour[iso] || []).filter(e => !(e.type === sauf.type && String(e.id) === String(sauf.id))).map(e =>
    e.type === 'epicerie' ? (e.annule ? 'Ce mois-là, l\'épicerie étudiante est annulée.' : 'Ce jour-là a aussi lieu l\'épicerie étudiante : le local sera occupé, prévoyez assez de monde.')
    : e.type === 'creneau' ? `Ce jour-là, il y a aussi « ${esc(e.k.nom)} » de ${fHeure(e.c.debut)} à ${fHeure(e.c.fin)}.`
    : `Ce jour-là, il y a aussi l'événement « ${esc(e.a.titre)} ».`);
}

async function deposer(type, id, iso) {
  const ev = CAL.evs.find(e => e.type === type && String(e.id) === String(id)); if (!ev || ev.iso === iso) return;
  const ctx = contexteDuJour(iso, ev);
  if (type === 'creneau') return deplacerCreneau(ev.c, iso, ctx.filter(t => !t.includes(`« ${esc(ev.k.nom)} »`)));
  if (type === 'epicerie') return deplacerEpicerie(ev.id, iso, ctx);
  if (type === 'actu') return deplacerActu(ev.a, iso, ctx);
}
