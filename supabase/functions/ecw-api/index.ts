// ═══════════════════════════════════════════════════════
//  ECW — fonction serveur des formulaires publics et de l'admin
//
//  Public : inscriptions (étudiant·es, bénévoles, lutin·es, gazette) et page /suivi/
//           (liens des e-mails : confirmer, annuler, présence, désinscription).
//  Super-admin : la balance des dons (lue en direct chez Stripe).
//  Admin  : validation des bénévoles, déplacement ou annulation d'une date (avec e-mails
//           aux personnes inscrites), envoi de la gazette (session admin requise).
//
//  Déployer : supabase functions deploy ecw-api
//  Secrets  : RESEND_API_KEY (déjà en place) ; STRIPE_SECRET_KEY (clé restreinte en lecture) ;
//             STRIPE_CHECKOUT_KEY (clé restreinte : Checkout Sessions en écriture, pour les dons mensuels) ; SITE_URL facultatif
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2';
import { adminClient, dateBxl, envoyer, Mail, SITE_URL } from '../_shared/mail.ts';
import * as M from '../_shared/modeles.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Refus extends Error {}   // erreur « métier » renvoyée telle quelle au navigateur

const db = adminClient();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const txt = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);
const requis = (v: string, champ: string) => { if (!v) throw new Refus(`champ_${champ}`); return v; };
const emailValide = (v: unknown) => { const e = txt(v, 254).toLowerCase(); if (!EMAIL.test(e)) throw new Refus('champ_email'); return e; };

async function emailAdmin(): Promise<string> {
  const { data } = await db.from('settings').select('value').eq('key', 'email_admin').maybeSingle();
  return data?.value || 'infos.ecwaterloo@gmail.com';
}

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(nom, args);
  if (error) {
    const code = (error.message || '').match(/^[a-z_]+$/) ? error.message : null;
    if (code) throw new Refus(code);
    throw new Error(error.message);
  }
  return data as T;
}

async function creneau(id: string) {
  const { data, error } = await db.from('benevole_creneaux').select('id, debut, fin, note, categorie:benevole_categories(nom, lieu, consignes)').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as unknown as { id: string; debut: string; fin: string; note: string; categorie: { nom: string; lieu: string; consignes: string } };
}

// ── Étudiant·es ────────────────────────────────────────────────────────
async function mailEtudiant(id: string) {
  const { data: e } = await db.from('inscriptions_etudiantes').select('*').eq('id', id).single();
  if (!e) return;
  if (e.statut === 'confirmé' && !e.mail_confirmation_at) {
    await envoyer(M.etudiantConfirmation(e));
    await db.from('inscriptions_etudiantes').update({ mail_confirmation_at: new Date().toISOString() }).eq('id', id);
  } else if (e.statut === 'liste_attente' && !e.mail_attente_at) {
    await envoyer(M.etudiantAttente(e));
    await db.from('inscriptions_etudiantes').update({ mail_attente_at: new Date().toISOString() }).eq('id', id);
  }
}

async function etudiantInscrire(b: Record<string, unknown>) {
  const r = await rpc<{ id: string; statut: string; date_rdv: string; date: string }>('inscrire_etudiant', {
    p_prenom: requis(txt(b.prenom, 80), 'prenom'), p_nom: requis(txt(b.nom, 80), 'nom'), p_genre: txt(b.genre, 30),
    p_email: emailValide(b.email), p_telephone: requis(txt(b.telephone, 40), 'telephone'),
    p_universite: requis(txt(b.universite, 120), 'universite'), p_nb: Math.max(1, Math.min(10, parseInt(String(b.nb), 10) || 1)),
  });
  await mailEtudiant(r.id);
  return { statut: r.statut, date_rdv: r.date_rdv, date: r.date };
}

// ── Bénévoles ──────────────────────────────────────────────────────────
async function benevoleInscrire(b: Record<string, unknown>) {
  // Un ou plusieurs créneaux en une fois : un seul e-mail de confirmation pour l'ensemble (même « lot »)
  const ids = [...new Set((Array.isArray(b.creneau_ids) ? b.creneau_ids : [b.creneau_id]).map(x => txt(x, 40)).filter(Boolean))].slice(0, 12);
  if (!ids.length) throw new Refus('champ_creneau');
  const personne = { p_prenom: requis(txt(b.prenom, 80), 'prenom'), p_nom: requis(txt(b.nom, 80), 'nom'), p_email: emailValide(b.email), p_telephone: txt(b.telephone, 40), p_message: txt(b.message, 1000) };
  const crees: string[] = []; const refus: { creneau_id: string; code: string }[] = [];
  for (const id of ids) {
    try { crees.push((await rpc<{ id: string }>('inscrire_benevole', { p_creneau: id, ...personne })).id); }
    catch (e) { if (e instanceof Refus) refus.push({ creneau_id: id, code: e.message }); else throw e; }
  }
  if (!crees.length) throw new Refus(refus[0]?.code || 'creneau_indisponible');
  const lot = crees[0];
  await db.from('benevole_inscriptions').update({ lot, mail_confirmation_at: new Date().toISOString() }).in('id', crees);
  const { data: ins } = await db.from('benevole_inscriptions').select('*').in('id', crees);
  const lignes = await Promise.all((ins || []).map(async i => ({ i, c: await creneau(i.creneau_id) })));
  lignes.sort((x, y) => Date.parse(x.c.debut) - Date.parse(y.c.debut));
  await envoyer(M.benevoleAConfirmer(lignes[0].i, lignes.map(l => l.c), ins!.find(i => i.id === lot)!.token));
  return { ok: true, inscrits: crees.length, refus };
}

// Toutes les inscriptions encore actives d'un même lot (ou l'inscription seule)
async function duLot(ins: { id: string; lot: string | null }) {
  if (!ins.lot) return [ins];
  return (await db.from('benevole_inscriptions').select('*').eq('lot', ins.lot).order('created_at')).data || [ins];
}

async function benevoleDecision(b: Record<string, unknown>) {
  const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(x => txt(x, 40)).filter(Boolean);
  if (!ids.length) throw new Refus('champ_id');
  const decision = b.decision === 'valide' ? 'valide' : b.decision === 'refuse' ? 'refuse' : null;
  if (!decision) throw new Refus('decision');
  const note = txt(b.note, 500);
  const { data: liste } = await db.from('benevole_inscriptions').select('*').in('id', ids);
  const aTraiter = (liste || []).filter(i => ['a_confirmer', 'confirme', 'valide', 'refuse'].includes(i.statut));
  if (!aTraiter.length) throw new Refus('introuvable');
  await db.from('benevole_inscriptions').update({ statut: decision, note_admin: note, valide_at: decision === 'valide' ? new Date().toISOString() : null }).in('id', aTraiter.map(i => i.id));
  const changees = aTraiter.filter(i => i.statut !== decision);
  if (changees.length) {
    const lignes = await Promise.all(changees.map(async i => ({ i: { ...i, note_admin: note }, c: await creneau(i.creneau_id) })));
    lignes.sort((x, y) => Date.parse(x.c.debut) - Date.parse(y.c.debut));
    await envoyer(decision === 'valide' ? M.benevoleValide(lignes, { parEquipe: false }) : M.benevoleRefuse(lignes[0].i, lignes.map(l => l.c)));
    await db.from('benevole_inscriptions').update({ mail_decision_at: new Date().toISOString() }).in('id', changees.map(i => i.id));
  }
  return { statut: decision, traitees: aTraiter.length };
}

// L'équipe inscrit quelqu'un qui a appelé : directement validé·e
async function benevoleAjouter(b: Record<string, unknown>) {
  const id = requis(txt(b.creneau_id, 40), 'creneau');
  const email = txt(b.email, 254) ? emailValide(b.email) : '';
  const ligne = { creneau_id: id, prenom: requis(txt(b.prenom, 80), 'prenom'), nom: requis(txt(b.nom, 80), 'nom'), email, telephone: txt(b.telephone, 40), message: txt(b.message, 1000),
    statut: 'valide', confirme_at: new Date().toISOString(), valide_at: new Date().toISOString(), note_admin: txt(b.note, 500) };
  const { data: ins, error } = await db.from('benevole_inscriptions').insert(ligne).select().single();
  if (error) throw new Error(error.message);
  if (email && b.prevenir !== false) {
    await envoyer(M.benevoleValide([{ i: ins, c: await creneau(id) }], { parEquipe: true }));
    await db.from('benevole_inscriptions').update({ mail_decision_at: new Date().toISOString() }).eq('id', ins.id);
  }
  return { ok: true, prevenu: !!(email && b.prevenir !== false) };
}

// La personne a prévenu l'équipe (téléphone, message) : désinscription sans e-mail de refus
async function benevoleAnnulerAdmin(b: Record<string, unknown>) {
  const { data: ins } = await db.from('benevole_inscriptions').select('*').eq('id', requis(txt(b.id, 40), 'id')).single();
  if (!ins) throw new Refus('introuvable');
  await db.from('benevole_inscriptions').update({ statut: 'annule', annule_at: new Date().toISOString(), presence: 'non' }).eq('id', ins.id);
  if (ins.email && b.prevenir) await envoyer(M.benevoleDesinscrit(ins, await creneau(ins.creneau_id)));
  return { ok: true };
}

// Une étudiante ou un étudiant a prévenu l'équipe : sa place passe à la liste d'attente
async function etudiantAnnulerAdmin(b: Record<string, unknown>) {
  const { data: e } = await db.from('inscriptions_etudiantes').select('*').eq('id', requis(txt(b.id, 40), 'id')).single();
  if (!e) throw new Refus('introuvable');
  const r = await rpc<{ promus: string[] }>('etudiant_annuler', { p_token: e.token });
  for (const id of r.promus || []) await mailEtudiant(id);
  if (b.prevenir) await envoyer(M.etudiantAnnuleParEquipe(e));
  return { promus: (r.promus || []).length };
}

// ── Admin : changer une date, avec les conséquences ─────────────────────
const ACTIFS_ETU = ['confirmé', 'rappel_envoyé', 'liste_attente'];
const ACTIFS_BEN = ['a_confirmer', 'confirme', 'valide'];
const libelle = async (d: string) => (await db.rpc('ecw_libelle_date', { d })).data as string;
const premierJeudi = (mois: string) => { const d = new Date(`${mois}-01T12:00:00Z`); d.setUTCDate(1 + (4 - d.getUTCDay() + 7) % 7); return d.toISOString().slice(0, 10); };

// Remplit les places libérées (ou ajoutées) avec la liste d'attente, dans l'ordre d'arrivée
async function promouvoir(lib: string, mois: string) {
  const { data: m } = await db.from('epicerie_mois').select('capacite').eq('mois', mois).maybeSingle();
  const { data: reg } = await db.from('settings').select('value').eq('key', 'capacite_etudiants').maybeSingle();
  const cap = m?.capacite ?? (reg?.value ? parseInt(reg.value, 10) : null);
  const { data: rows } = await db.from('inscriptions_etudiantes').select('id, nb_personnes, statut, created_at').eq('date_rdv', lib).in('statut', ['confirmé', 'rappel_envoyé', 'présent', 'liste_attente']).order('created_at');
  let pris = (rows || []).filter(r => r.statut !== 'liste_attente').reduce((a, r) => a + r.nb_personnes, 0);
  const promus: string[] = [];
  for (const r of (rows || []).filter(r => r.statut === 'liste_attente')) {
    if (cap != null && pris + r.nb_personnes > cap) break;
    await db.from('inscriptions_etudiantes').update({ statut: 'confirmé', depuis_attente: true, mail_confirmation_at: null }).eq('id', r.id);
    pris += r.nb_personnes; promus.push(r.id);
  }
  for (const id of promus) await mailEtudiant(id);
  return promus.length;
}

async function epicerieMaj(b: Record<string, unknown>) {
  const mois = txt(b.mois, 7);
  if (!/^\d{4}-\d{2}$/.test(mois)) throw new Refus('mois');
  const { data: avant } = await db.from('epicerie_mois').select('*').eq('mois', mois).maybeSingle();
  const jourAvant = (await db.rpc('epicerie_date_mois', { p_mois: mois })).data as string;
  let jour = 'jour' in b ? (txt(b.jour, 10) || null) : (avant?.jour ?? null);
  if (jour && !jour.startsWith(mois)) throw new Refus('hors_mois');
  if (jour === premierJeudi(mois)) jour = null;
  const annule = 'annule' in b ? !!b.annule : !!avant?.annule;
  const capacite = 'capacite' in b ? (b.capacite == null || b.capacite === '' ? null : Math.max(1, parseInt(String(b.capacite), 10))) : (avant?.capacite ?? null);
  const note = 'note' in b ? txt(b.note, 200) : (avant?.note ?? '');
  const { error } = await db.from('epicerie_mois').upsert({ mois, jour, annule, capacite, note, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  const jourApres = jour || premierJeudi(mois);
  if (jourApres < dateBxl(new Date()) && jourApres !== jourAvant) throw new Refus('date_passee');

  const prevenir = b.prevenir !== false, message = txt(b.message, 600);
  const libAvant = await libelle(jourAvant), libApres = await libelle(jourApres);
  const { data: inscrits } = await db.from('inscriptions_etudiantes').select('*').eq('date_rdv', libAvant).in('statut', ACTIFS_ETU);
  const mails: Mail[] = [];
  let touches = 0, promus = 0;

  if (annule && !avant?.annule) {
    const prochaine = await db.rpc('epicerie_prochaine');
    for (const e of inscrits || []) {
      await db.from('inscriptions_etudiantes').update({ statut: 'annulé', annule_at: new Date().toISOString() }).eq('id', e.id);
      if (prevenir) mails.push(M.etudiantMoisAnnule(e, message, prochaine.data?.libelle ?? null));
      touches++;
    }
  } else if (!annule && jourApres !== jourAvant) {
    for (const e of inscrits || []) {
      const maj = { date_rdv: libApres, date_jour: jourApres, statut: e.statut === 'rappel_envoyé' ? 'confirmé' : e.statut };
      await db.from('inscriptions_etudiantes').update(maj).eq('id', e.id);
      if (prevenir) mails.push(M.etudiantDeplace({ ...e, ...maj }, libAvant, message));
      touches++;
    }
  }
  if (mails.length) await envoyer(mails);
  if (!annule) promus = await promouvoir(libApres, mois);
  return { touches, prevenus: mails.length, promus };
}

async function creneauMaj(b: Record<string, unknown>) {
  const id = requis(txt(b.id, 40), 'id');
  const { data: avant } = await db.from('benevole_creneaux').select('*').eq('id', id).single();
  if (!avant) throw new Refus('introuvable');
  const maj: Record<string, unknown> = {};
  for (const k of ['categorie_id', 'debut', 'fin', 'note', 'publie', 'places']) if (k in b) maj[k] = b[k];
  if (maj.debut && Date.parse(String(maj.debut)) < Date.now() && Date.parse(avant.debut) !== Date.parse(String(maj.debut))) throw new Refus('date_passee');
  const { error } = await db.from('benevole_creneaux').update(maj).eq('id', id);
  if (error) throw new Refus(error.message.includes('check') ? 'horaire' : 'serveur');
  const deplace = Date.parse(String(maj.debut ?? avant.debut)) !== Date.parse(avant.debut) || Date.parse(String(maj.fin ?? avant.fin)) !== Date.parse(avant.fin);
  if (!deplace) return { prevenus: 0 };
  const { data: inscrits } = await db.from('benevole_inscriptions').select('*').eq('creneau_id', id).in('statut', ACTIFS_BEN);
  // Le rappel repartira la veille de la nouvelle date ; la présence est à reconfirmer
  if (inscrits?.length) await db.from('benevole_inscriptions').update({ mail_rappel_at: null, presence: null }).eq('creneau_id', id).in('statut', ACTIFS_BEN);
  if (b.prevenir === false || !inscrits?.length) return { prevenus: 0 };
  const c = await creneau(id); const message = txt(b.message, 600);
  await envoyer(inscrits.map(i => M.benevoleDeplace(i, c, avant, message)));
  return { prevenus: inscrits.length };
}

async function creneauSupprimer(b: Record<string, unknown>) {
  const id = requis(txt(b.id, 40), 'id');
  const c = await creneau(id);
  const { data: inscrits } = await db.from('benevole_inscriptions').select('*').eq('creneau_id', id).in('statut', ACTIFS_BEN);
  const prevenir = b.prevenir !== false && Date.parse(c.debut) > Date.now();
  if (prevenir && inscrits?.length) await envoyer(inscrits.map(i => M.benevoleCreneauAnnule(i, c, txt(b.message, 600))));
  const { error } = await db.from('benevole_creneaux').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { prevenus: prevenir ? inscrits?.length || 0 : 0 };
}

// ── Lutins de Noël ─────────────────────────────────────────────────────
async function lutinInscrire(b: Record<string, unknown>) {
  const email = txt(b.email, 254) ? emailValide(b.email) : null;
  const telephone = txt(b.telephone, 40) || null;
  if (!email && !telephone) throw new Refus('champ_contact');
  const ligne = { prenom: requis(txt(b.prenom, 80), 'prenom'), nom: requis(txt(b.nom, 80), 'nom'), email, telephone, nb_lettres: Math.max(1, Math.min(20, parseInt(String(b.nb_lettres), 10) || 1)) };
  const { error } = await db.from('inscriptions_lutins').insert(ligne);
  if (error) throw new Error(error.message);
  // L'inscription est enregistrée : un e-mail en échec ne doit pas la faire échouer
  try { await envoyer([...(email ? [M.lutinMerci(ligne)] : []), M.adminNouveauLutin(await emailAdmin(), ligne)]); } catch (e) { console.error('mails lutin', e); }
  return { ok: true };
}

// ── Gazette ────────────────────────────────────────────────────────────
async function gazetteAbonner(b: Record<string, unknown>) {
  const email = emailValide(b.email);
  const { data: ab } = await db.from('abonnes_gazette').select('*').eq('email', email).maybeSingle();
  if (ab?.statut === 'actif') return { statut: 'deja_abonne' };
  // Une seule relance toutes les 10 minutes pour une même adresse
  if (ab?.mail_confirmation_at && Date.now() - Date.parse(ab.mail_confirmation_at) < 10 * 60e3) return { statut: 'a_confirmer' };
  const ligne = ab
    ? (await db.from('abonnes_gazette').update({ statut: 'a_confirmer', mail_confirmation_at: new Date().toISOString() }).eq('id', ab.id).select().single()).data
    : (await db.from('abonnes_gazette').insert({ email, mail_confirmation_at: new Date().toISOString() }).select().single()).data;
  await envoyer(M.gazetteConfirmer(email, ligne.token));
  return { statut: 'a_confirmer' };
}

async function gazetteEnvoyer(b: Record<string, unknown>) {
  const { data: g } = await db.from('gazettes').select('*').eq('id', requis(txt(b.gazette_id, 40), 'gazette')).single();
  if (!g) throw new Refus('introuvable');
  if (g.envoyee_at && !b.forcer) throw new Refus('deja_envoyee');
  const { data: abonnes } = await db.from('abonnes_gazette').select('email, token').eq('statut', 'actif');
  const liste = abonnes || [];
  await envoyer(liste.map(a => M.gazetteEnvoi(a.email, a.token, g)));
  await db.from('gazettes').update({ envoyee_at: new Date().toISOString(), envoyee_nb: liste.length }).eq('id', g.id);
  return { envoyes: liste.length };
}

// ── Page /suivi/ : ce que permet un lien reçu par e-mail ────────────────
async function trouverJeton(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new Refus('lien_invalide');
  const e = (await db.from('inscriptions_etudiantes').select('*').eq('token', token).maybeSingle()).data;
  if (e) return { type: 'etudiant' as const, ligne: e };
  const b = (await db.from('benevole_inscriptions').select('*').eq('token', token).maybeSingle()).data;
  if (b) return { type: 'benevole' as const, ligne: b };
  const a = (await db.from('abonnes_gazette').select('*').eq('token', token).maybeSingle()).data;
  if (a) return { type: 'gazette' as const, ligne: a };
  throw new Refus('lien_invalide');
}

async function resume(token: string) {
  const t = await trouverJeton(token);
  if (t.type === 'etudiant') {
    const e = t.ligne;
    const futur = !e.date_jour || e.date_jour >= dateBxl(new Date());
    return { type: 'etudiant', prenom: e.prenom, date_rdv: e.date_rdv, date: e.date_jour, nb: e.nb_personnes, statut: e.statut,
      actions: futur && ['confirmé', 'rappel_envoyé', 'liste_attente'].includes(e.statut) ? ['annuler'] : [] };
  }
  if (t.type === 'benevole') {
    const b = t.ligne; const c = await creneau(b.creneau_id);
    const futur = Date.parse(c.debut) > Date.now();
    const expire = b.statut === 'a_confirmer' && Date.now() - Date.parse(b.created_at) > 48 * 3600e3;
    const actions: string[] = [];
    if (futur && b.statut === 'a_confirmer' && !expire) actions.push('confirmer');
    if (futur && b.statut === 'valide' && Date.parse(c.debut) - Date.now() < 3 * 864e5) actions.push('presence_oui');
    if (futur && ['a_confirmer', 'confirme', 'valide'].includes(b.statut) && !expire) actions.push('annuler');
    // Les autres créneaux choisis en même temps, chacun avec son propre lien
    const freres = b.lot ? (await duLot(b)).filter(x => x.id !== b.id) : [];
    const lot = await Promise.all(freres.map(async x => { const cx = await creneau(x.creneau_id); return { token: x.token, statut: x.statut, debut: cx.debut, fin: cx.fin, categorie: cx.categorie.nom }; }));
    return { type: 'benevole', prenom: b.prenom, statut: expire ? 'expire' : b.statut, presence: b.presence,
      creneau: { debut: c.debut, fin: c.fin, categorie: c.categorie.nom, lieu: c.categorie.lieu, consignes: c.categorie.consignes }, actions,
      lot: lot.sort((x, y) => Date.parse(x.debut) - Date.parse(y.debut)) };
  }
  const a = t.ligne;
  return { type: 'gazette', email: a.email, statut: a.statut,
    actions: a.statut === 'a_confirmer' ? ['confirmer', 'desabonner'] : a.statut === 'actif' ? ['desabonner'] : ['confirmer'] };
}

async function action(token: string, quoi: string) {
  const avant = await resume(token);
  if (!avant.actions.includes(quoi)) return { ...avant, deja: true };
  const t = await trouverJeton(token);
  const now = new Date().toISOString();

  if (t.type === 'etudiant' && quoi === 'annuler') {
    const r = await rpc<{ promus: string[] }>('etudiant_annuler', { p_token: token });
    for (const id of r.promus || []) await mailEtudiant(id);
  }
  if (t.type === 'benevole') {
    const b = t.ligne; const c = await creneau(b.creneau_id); const admin = await emailAdmin();
    if (quoi === 'confirmer') {
      // Confirmer le lien confirme tous les créneaux choisis en même temps (encore à venir)
      const lot = (await duLot(b)).filter(x => x.statut === 'a_confirmer');
      const ids = lot.map(x => x.id);
      await db.from('benevole_inscriptions').update({ statut: 'confirme', confirme_at: now }).in('id', ids).eq('statut', 'a_confirmer');
      const crs = (await Promise.all(lot.map(x => creneau(x.creneau_id)))).filter(x => Date.parse(x.debut) > Date.now()).sort((x, y) => Date.parse(x.debut) - Date.parse(y.debut));
      await envoyer(M.adminNouvelleInscription(admin, b, crs.length ? crs : [c]));
      await db.from('benevole_inscriptions').update({ admin_notifie_at: now }).in('id', ids);
    }
    if (quoi === 'presence_oui') await db.from('benevole_inscriptions').update({ presence: 'oui' }).eq('id', b.id);
    if (quoi === 'annuler') {
      await db.from('benevole_inscriptions').update({ statut: 'annule', annule_at: now, presence: 'non' }).eq('id', b.id);
      // L'équipe n'est prévenue que si elle attendait cette personne (confirmée ou validée)
      if (['confirme', 'valide'].includes(b.statut)) await envoyer(M.adminAnnulation(admin, b, c, b.statut === 'valide' ? 'Désistement après validation.' : 'Désistement avant validation.'));
    }
  }
  if (t.type === 'gazette') {
    if (quoi === 'confirmer') await db.from('abonnes_gazette').update({ statut: 'actif', confirme_at: now }).eq('id', t.ligne.id);
    if (quoi === 'desabonner') await db.from('abonnes_gazette').update({ statut: 'desabonne' }).eq('id', t.ligne.id);
  }
  return await resume(token);
}

// ── Dons (super-admin) : lus en direct chez Stripe ─────────────────────
// Clé restreinte en lecture seule (Balance, Charges, Payouts) : supabase secrets set STRIPE_SECRET_KEY=rk_live_…
async function stripe(chemin: string) {
  const r = await fetch(`https://api.stripe.com/v1/${chemin}`, { headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` } });
  const j = await r.json();
  if (!r.ok) { console.error('stripe', chemin, j?.error?.message); throw new Refus(r.status === 401 ? 'stripe_cle' : r.status === 403 ? 'stripe_droits' : 'stripe'); }
  return j;
}
const moisDe = (sec: number) => dateBxl(new Date(sec * 1000)).slice(0, 7);

async function donsResume() {
  if (Deno.env.get('STRIPE_MOCK') === '1') return donsFictifs();
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return { relie: false };
  const depuis = new Date(); depuis.setMonth(depuis.getMonth() - 11, 1); depuis.setHours(0, 0, 0, 0);
  const [solde, virements] = await Promise.all([stripe('balance'), stripe('payouts?limit=6')]);
  const charges: Record<string, any>[] = [];
  let apres = '';
  for (let page = 0; page < 10; page++) {   // jusqu'à 1 000 paiements sur 12 mois
    const j = await stripe(`charges?limit=100&created[gte]=${Math.floor(depuis.getTime() / 1000)}&expand[]=data.balance_transaction${apres ? `&starting_after=${apres}` : ''}`);
    charges.push(...j.data);
    if (!j.has_more) break;
    apres = j.data.at(-1).id;
  }
  const reussis = charges.filter(c => c.paid && c.status === 'succeeded');
  const net = (c: any) => (c.balance_transaction?.net ?? c.amount) - (c.amount_refunded || 0);
  const frais = (c: any) => c.balance_transaction?.fee ?? 0;
  const eur = (l: { amount: number; currency: string }[]) => l.filter(x => x.currency === 'eur').reduce((a, x) => a + x.amount, 0);
  const cles = Array.from({ length: 12 }, (_, k) => { const d = new Date(depuis); d.setMonth(d.getMonth() + k); return dateBxl(new Date(d.getTime() + 864e5)).slice(0, 7); });
  const annee = dateBxl(new Date()).slice(0, 4);
  const deLAnnee = reussis.filter(c => moisDe(c.created).startsWith(annee));
  const qui = (c: any) => (c.billing_details?.email || c.receipt_email || c.billing_details?.name || c.id).toLowerCase();
  // Dons mensuels actifs (facultatif : demande l'accès en lecture aux « Subscriptions »)
  let mensuels: { nb: number; total: number } | null = null;
  try {
    const subs = await stripe('subscriptions?status=active&limit=100');
    const parMois = (it: any) => { const pr = it.price || it.plan; const u = (pr?.unit_amount ?? pr?.amount ?? 0) * (it.quantity || 1); const r = pr?.recurring || pr; const n = r?.interval_count || 1; return r?.interval === 'year' ? u / (12 * n) : r?.interval === 'week' ? u * 52 / (12 * n) : u / n; };
    mensuels = { nb: subs.data.length, total: Math.round(subs.data.reduce((a: number, sub: any) => a + sub.items.data.reduce((b: number, it: any) => b + parMois(it), 0), 0)) };
  } catch (_) { /* clé sans accès aux abonnements : la carte n'est pas affichée */ }
  const tableau = `https://dashboard.stripe.com/${solde.livemode ? '' : 'test/'}`;
  return {
    relie: true, test: !solde.livemode, tableau, mensuels,
    solde: { disponible: eur(solde.available), en_cours: eur(solde.pending) },
    mois: cles.map(m => { const l = reussis.filter(c => moisDe(c.created) === m); return { mois: m, brut: l.reduce((a, c) => a + c.amount - (c.amount_refunded || 0), 0), net: l.reduce((a, c) => a + net(c), 0), nb: l.length }; }),
    annee: { annee, brut: deLAnnee.reduce((a, c) => a + c.amount - (c.amount_refunded || 0), 0), net: deLAnnee.reduce((a, c) => a + net(c), 0), frais: deLAnnee.reduce((a, c) => a + frais(c), 0), nb: deLAnnee.length, donateurs: new Set(deLAnnee.map(qui)).size },
    dons: charges.slice(0, 1000).map(c => ({ id: c.id, date: new Date(c.created * 1000).toISOString(), nom: c.billing_details?.name || '', email: c.billing_details?.email || c.receipt_email || '', montant: c.amount, frais: frais(c), net: net(c), rembourse: c.amount_refunded || 0,
      statut: c.refunded ? 'rembourse' : c.status === 'succeeded' && c.paid ? 'ok' : c.status, recurrent: !!c.invoice, lien: `${tableau}payments/${c.payment_intent || c.id}` })),
    virements: (virements.data || []).map((v: any) => ({ montant: v.amount, arrivee: new Date(v.arrival_date * 1000).toISOString(), statut: v.status })),
  };
}

// Données d'exemple pour développer en local sans compte Stripe (STRIPE_MOCK=1)
function donsFictifs() {
  const noms = ['Claire Dubois', 'Marc Janssens', 'Fatima El Amrani', 'Pierre Lambert', 'Sophie Martin', 'Anonyme', 'Jean Peeters', 'Nadia Benali'];
  const montants = [1000, 2500, 5000, 10000, 2000, 1500];
  const dons = Array.from({ length: 46 }, (_, k) => { const d = new Date(Date.now() - k * 7.3 * 864e5); const m = montants[(k * 7) % montants.length]; const f = Math.round(m * 0.015 + 25);
    return { id: `ch_${k}`, date: d.toISOString(), nom: noms[k % noms.length], email: `${noms[k % noms.length].split(' ')[0].toLowerCase()}@exemple.be`, montant: m, frais: f, net: m - f, rembourse: k === 9 ? m : 0, statut: k === 9 ? 'rembourse' : 'ok', recurrent: k % 4 === 0, lien: 'https://dashboard.stripe.com/test/payments' }; });
  const parMois: Record<string, { brut: number; net: number; nb: number }> = {};
  for (const d of dons.filter(d => d.statut === 'ok')) { const m = dateBxl(new Date(d.date)).slice(0, 7); parMois[m] ||= { brut: 0, net: 0, nb: 0 }; parMois[m].brut += d.montant; parMois[m].net += d.net; parMois[m].nb++; }
  const cles = Array.from({ length: 12 }, (_, k) => { const d = new Date(); d.setMonth(d.getMonth() - 11 + k, 15); return dateBxl(d).slice(0, 7); });
  const annee = dateBxl(new Date()).slice(0, 4); const da = dons.filter(d => d.statut === 'ok' && d.date.startsWith(annee));
  return { relie: true, test: true, tableau: 'https://dashboard.stripe.com/test/', solde: { disponible: 18450, en_cours: 4925 }, mensuels: { nb: 6, total: 9500 },
    mois: cles.map(m => ({ mois: m, ...(parMois[m] || { brut: 0, net: 0, nb: 0 }) })),
    annee: { annee, brut: da.reduce((a, d) => a + d.montant, 0), net: da.reduce((a, d) => a + d.net, 0), frais: da.reduce((a, d) => a + d.frais, 0), nb: da.length, donateurs: new Set(da.map(d => d.email)).size },
    dons, virements: [{ montant: 32000, arrivee: new Date(Date.now() - 12 * 864e5).toISOString(), statut: 'paid' }, { montant: 21500, arrivee: new Date(Date.now() + 2 * 864e5).toISOString(), statut: 'in_transit' }] };
}

// ── Dons à montant libre : une fois (2 € minimum) ou chaque mois (5 € minimum) ──
// Les liens de paiement Stripe ne laissent pas choisir le montant d'un paiement récurrent :
// le serveur crée donc la page de paiement Stripe pour le montant choisi sur le site.
const PRODUITS_DON = {
  mois: Deno.env.get('STRIPE_PRODUIT_DON_MENSUEL') || 'prod_VPOXRJMFgQMZp4',   // « Don mensuel — Espace Convivial de Waterloo »
  une: Deno.env.get('STRIPE_PRODUIT_DON') || '',                               // un produit « Don — Espace Convivial de Waterloo »
};
async function don(b: Record<string, unknown>) {
  const frequence = b.frequence === 'une' ? 'une' : 'mois';
  const montant = Math.round(Number(String(b.montant ?? '').replace(',', '.')));
  if (!Number.isFinite(montant) || montant < (frequence === 'mois' ? 5 : 2)) throw new Refus('montant_min');
  if (montant > (frequence === 'mois' ? 2000 : 10000)) throw new Refus('montant_max');
  const retour = (etat: string) => `${SITE_URL}/aider/?don=${etat}${frequence === 'une' ? '-unique' : ''}#don`;
  if (Deno.env.get('STRIPE_MOCK') === '1') return { url: retour('merci'), montant };   // développement local
  const cle = Deno.env.get('STRIPE_CHECKOUT_KEY');
  if (!cle || !PRODUITS_DON[frequence]) throw new Refus('indisponible');
  const p = new URLSearchParams({
    mode: frequence === 'mois' ? 'subscription' : 'payment', locale: 'fr',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][product]': PRODUITS_DON[frequence],
    'line_items[0][price_data][unit_amount]': String(montant * 100),
    success_url: retour('merci'), cancel_url: retour('annule'),
  });
  if (frequence === 'mois') {
    p.set('line_items[0][price_data][recurring][interval]', 'month');
    p.set('custom_text[submit][message]', 'Vous pourrez modifier ou arrêter votre don mensuel à tout moment, depuis le lien présent dans chaque reçu.');
  } else {
    p.set('submit_type', 'donate');
  }
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p });
  const j = await r.json();
  if (!r.ok) { console.error('checkout', j?.error?.message); throw new Refus('indisponible'); }
  return { url: j.url };
}

// ── Session admin ──────────────────────────────────────────────────────
async function exigerAdmin(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await client.auth.getUser();
  if (!data?.user) throw new Refus('non_autorise');
  return data.user;
}
// Super-admin : rôle posé dans app_metadata (modifiable seulement côté serveur, jamais par l'utilisateur)
async function exigerSuperAdmin(req: Request) {
  const u = await exigerAdmin(req);
  if (u.app_metadata?.role !== 'super_admin') throw new Refus('non_autorise');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const b = await req.json().catch(() => ({}));
    // Pot de miel : les robots remplissent ce champ invisible
    if (b.site_web) return json({ ok: true });
    switch (b.action) {
      case 'etudiant_inscrire': return json(await etudiantInscrire(b));
      case 'benevole_inscrire': return json(await benevoleInscrire(b));
      case 'gazette_abonner':   return json(await gazetteAbonner(b));
      case 'lutin_inscrire':    return json(await lutinInscrire(b));
      case 'don':               return json(await don(b));
      case 'don_mensuel':       return json(await don({ ...b, frequence: 'mois' }));
      case 'suivi':             return json(await resume(txt(b.token, 40)));
      case 'suivi_action':      return json(await action(txt(b.token, 40), txt(b.quoi, 30)));
      case 'benevole_decision': await exigerAdmin(req); return json(await benevoleDecision(b));
      case 'gazette_envoyer':   await exigerAdmin(req); return json(await gazetteEnvoyer(b));
      case 'epicerie_maj':      await exigerAdmin(req); return json(await epicerieMaj(b));
      case 'creneau_maj':       await exigerAdmin(req); return json(await creneauMaj(b));
      case 'creneau_supprimer': await exigerAdmin(req); return json(await creneauSupprimer(b));
      case 'benevole_ajouter':  await exigerAdmin(req); return json(await benevoleAjouter(b));
      case 'benevole_annuler':  await exigerAdmin(req); return json(await benevoleAnnulerAdmin(b));
      case 'etudiant_annuler':  await exigerAdmin(req); return json(await etudiantAnnulerAdmin(b));
      case 'dons_resume':       await exigerSuperAdmin(req); return json(await donsResume());
      case 'etudiant_mail':     await exigerAdmin(req); await mailEtudiant(txt(b.id, 40)); return json({ ok: true });
      default: return json({ erreur: 'action_inconnue' }, 400);
    }
  } catch (e) {
    if (e instanceof Refus) return json({ erreur: e.message }, 422);
    console.error(e);
    return json({ erreur: 'serveur' }, 500);
  }
});
