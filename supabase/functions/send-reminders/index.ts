// ═══════════════════════════════════════════════════════
//  ECW — rappels automatiques, appelée chaque matin à 8 h (pg_cron, voir README)
//  · épicerie étudiante : rappel la veille, avec lien d'annulation
//  · bénévoles : rappel la veille d'un créneau validé, avec « je serai là / je ne peux plus venir »
//  · inscriptions bénévoles non confirmées depuis 48 h : marquées expirées (place libérée)
//  Déployer : supabase functions deploy send-reminders
// ═══════════════════════════════════════════════════════

import { adminClient, dateBxl, envoyer } from '../_shared/mail.ts';
import * as M from '../_shared/modeles.ts';

const db = adminClient();
const jour = (decalage: number) => dateBxl(new Date(Date.now() + decalage * 864e5));

async function rappelsEtudiants() {
  const demain = jour(1);
  const { data: d } = await db.rpc('epicerie_date_mois', { p_mois: demain.slice(0, 7) });
  if (d !== demain) return { etudiants: 'pas_demain' };
  const { data: mois } = await db.from('epicerie_mois').select('annule').eq('mois', demain.slice(0, 7)).maybeSingle();
  if (mois?.annule) return { etudiants: 'annule' };
  const { data: libelle } = await db.rpc('ecw_libelle_date', { d: demain });
  const { data: inscrits } = await db.from('inscriptions_etudiantes').select('*').eq('date_rdv', libelle).eq('statut', 'confirmé');
  let n = 0;
  for (const e of inscrits || []) {
    try {
      await envoyer(M.etudiantRappel(e));
      await db.from('inscriptions_etudiantes').update({ statut: 'rappel_envoyé' }).eq('id', e.id);
      n++;
    } catch (err) { console.error('rappel étudiant', e.id, err); }
  }
  return { etudiants: n };
}

async function rappelsBenevoles() {
  const demain = jour(1);
  const { data: proches } = await db.from('benevole_creneaux')
    .select('id, debut, fin, note, categorie:benevole_categories(nom, lieu, consignes)')
    .gte('debut', new Date().toISOString()).lt('debut', new Date(Date.now() + 3 * 864e5).toISOString());
  const creneaux = (proches || []).filter(c => dateBxl(new Date(c.debut)) === demain);
  let n = 0;
  for (const c of creneaux) {
    const { data: ins } = await db.from('benevole_inscriptions').select('*').eq('creneau_id', c.id).eq('statut', 'valide').is('mail_rappel_at', null);
    for (const b of ins || []) {
      try {
        await envoyer(M.benevoleRappel(b, c as never));
        await db.from('benevole_inscriptions').update({ mail_rappel_at: new Date().toISOString() }).eq('id', b.id);
        n++;
      } catch (err) { console.error('rappel bénévole', b.id, err); }
    }
  }
  return { benevoles: n };
}

async function expirer() {
  const limite = new Date(Date.now() - 48 * 3600e3).toISOString();
  const { data } = await db.from('benevole_inscriptions').update({ statut: 'expire' }).eq('statut', 'a_confirmer').lt('created_at', limite).select('id');
  return { expirees: data?.length || 0 };
}

Deno.serve(async () => {
  const r = { ...(await rappelsEtudiants()), ...(await rappelsBenevoles()), ...(await expirer()) };
  console.log('rappels', r);
  return new Response(JSON.stringify({ ok: true, ...r }), { headers: { 'Content-Type': 'application/json' } });
});
