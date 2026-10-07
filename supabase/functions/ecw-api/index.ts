// ═══════════════════════════════════════════════════════
//  ECW — fonction serveur des formulaires publics et de l'admin
//
//  Public : inscriptions (étudiant·es, bénévoles, lutin·es, gazette) et page /suivi/
//           (liens des e-mails : confirmer, annuler, présence, désinscription).
//  Admin  : validation des bénévoles, déplacement ou annulation d'une date (avec e-mails
//           aux personnes inscrites), envoi de la gazette (session admin requise).
//
//  Déployer : supabase functions deploy ecw-api
//  Secrets  : RESEND_API_KEY (déjà en place) ; SITE_URL facultatif
// ═══════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2';
import { adminClient, dateBxl, envoyer, Mail } from '../_shared/mail.ts';
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
  const r = await rpc<{ id: string }>('inscrire_benevole', {
    p_creneau: requis(txt(b.creneau_id, 40), 'creneau'), p_prenom: requis(txt(b.prenom, 80), 'prenom'),
    p_nom: requis(txt(b.nom, 80), 'nom'), p_email: emailValide(b.email),
    p_telephone: txt(b.telephone, 40), p_message: txt(b.message, 1000),
  });
  const { data: ins } = await db.from('benevole_inscriptions').select('*').eq('id', r.id).single();
  await envoyer(M.benevoleAConfirmer(ins, await creneau(ins.creneau_id)));
  await db.from('benevole_inscriptions').update({ mail_confirmation_at: new Date().toISOString() }).eq('id', r.id);
  return { ok: true };
}

async function benevoleDecision(b: Record<string, unknown>) {
  const id = requis(txt(b.id, 40), 'id');
  const decision = b.decision === 'valide' ? 'valide' : b.decision === 'refuse' ? 'refuse' : null;
  if (!decision) throw new Refus('decision');
  const { data: ins } = await db.from('benevole_inscriptions').select('*').eq('id', id).single();
  if (!ins) throw new Refus('introuvable');
  if (!['a_confirmer', 'confirme', 'valide', 'refuse'].includes(ins.statut)) throw new Refus('etat_' + ins.statut);
  const note = txt(b.note, 500);
  const maj = { statut: decision, note_admin: note, valide_at: decision === 'valide' ? new Date().toISOString() : null };
  await db.from('benevole_inscriptions').update(maj).eq('id', id);
  if (ins.statut !== decision) {
    const c = await creneau(ins.creneau_id);
    await envoyer(decision === 'valide' ? M.benevoleValide({ ...ins, note_admin: note }, c) : M.benevoleRefuse({ ...ins, note_admin: note }, c));
    await db.from('benevole_inscriptions').update({ mail_decision_at: new Date().toISOString() }).eq('id', id);
  }
  return { statut: decision };
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
    return { type: 'benevole', prenom: b.prenom, statut: expire ? 'expire' : b.statut, presence: b.presence,
      creneau: { debut: c.debut, fin: c.fin, categorie: c.categorie.nom, lieu: c.categorie.lieu, consignes: c.categorie.consignes }, actions };
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
      await db.from('benevole_inscriptions').update({ statut: 'confirme', confirme_at: now }).eq('id', b.id).eq('statut', 'a_confirmer');
      await envoyer(M.adminNouvelleInscription(admin, b, c));
      await db.from('benevole_inscriptions').update({ admin_notifie_at: now }).eq('id', b.id);
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

// ── Session admin ──────────────────────────────────────────────────────
async function exigerAdmin(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await client.auth.getUser();
  if (!data?.user) throw new Refus('non_autorise');
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
      case 'suivi':             return json(await resume(txt(b.token, 40)));
      case 'suivi_action':      return json(await action(txt(b.token, 40), txt(b.quoi, 30)));
      case 'benevole_decision': await exigerAdmin(req); return json(await benevoleDecision(b));
      case 'gazette_envoyer':   await exigerAdmin(req); return json(await gazetteEnvoyer(b));
      case 'epicerie_maj':      await exigerAdmin(req); return json(await epicerieMaj(b));
      case 'creneau_maj':       await exigerAdmin(req); return json(await creneauMaj(b));
      case 'creneau_supprimer': await exigerAdmin(req); return json(await creneauSupprimer(b));
      case 'etudiant_mail':     await exigerAdmin(req); await mailEtudiant(txt(b.id, 40)); return json({ ok: true });
      default: return json({ erreur: 'action_inconnue' }, 400);
    }
  } catch (e) {
    if (e instanceof Refus) return json({ erreur: e.message }, 422);
    console.error(e);
    return json({ erreur: 'serveur' }, 500);
  }
});
