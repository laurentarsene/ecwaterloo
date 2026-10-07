// ═══════════════════════════════════════════════════════
//  ECW — contenus des e-mails (tu : étudiant·es ; vous : bénévoles, gazette)
// ═══════════════════════════════════════════════════════

import { ADRESSE, SITE_URL, TEL, bouton, encadre, esc, heure, ics, jourLong, majuscule, page, Mail } from './mail.ts';

const suivi = (token: string) => `${SITE_URL}/suivi/?t=${token}`;

// ── Épicerie étudiante ──────────────────────────────────────────────────
type Etu = { id: string; prenom: string; email: string; date_rdv: string; date_jour: string | null; nb_personnes: number; token: string; depuis_attente?: boolean };

export function etudiantConfirmation(e: Etu): Mail {
  const total = e.nb_personnes * 5;
  return {
    to: e.email,
    subject: e.depuis_attente ? `Une place s'est libérée : à ${e.date_rdv.split(' ')[0].toLowerCase()} !` : `Inscription confirmée · Épicerie étudiante · ${e.date_rdv}`,
    html: page({
      titre: e.depuis_attente ? 'Bonne nouvelle, une place s\'est libérée' : 'C\'est noté, à bientôt !',
      bandeau: '#4d9aa8',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(e.prenom)},</p>
        <p style="margin:0 0 16px;">${e.depuis_attente ? 'Tu étais sur la liste d\'attente : ta place est maintenant confirmée pour l\'épicerie étudiante.' : 'Ton inscription à l\'épicerie étudiante est confirmée.'}</p>
        ${encadre([`<strong>${esc(e.date_rdv)}</strong>`, esc(ADRESSE), `Pour ${e.nb_personnes} personne${e.nb_personnes > 1 ? 's' : ''}`])}
        ${encadre([`<strong>N'oublie pas ${total}€ en liquide</strong> (${e.nb_personnes} × 5€) et un sac.`], '#eef0c9')}
        <p style="margin:0 0 20px;">Tu recevras un rappel la veille. Le fichier joint ajoute la date à ton agenda.</p>
        <p style="margin:0 0 8px;">Un empêchement ? Préviens-nous en un clic, ta place ira à quelqu'un sur la liste d'attente :</p>
        ${bouton('Je ne peux plus venir', suivi(e.token), 'line')}`,
      bas: 'Une absence non excusée empêche de se réinscrire par la suite.',
    }),
    attachments: e.date_jour ? [ics({ uid: `etu-${e.id}`, debut: new Date(), fin: new Date(), jourEntier: e.date_jour, titre: 'Épicerie étudiante · ECW', lieu: ADRESSE, description: `Pense à ${total}€ en liquide et à un sac. Annuler : ${suivi(e.token)}` })] : undefined,
  };
}

export function etudiantAttente(e: Etu): Mail {
  return {
    to: e.email,
    subject: `Liste d'attente · Épicerie étudiante · ${e.date_rdv}`,
    html: page({
      titre: 'Tu es sur la liste d\'attente',
      bandeau: '#4d9aa8',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(e.prenom)},</p>
        <p style="margin:0 0 16px;">L'épicerie étudiante du <strong>${esc(e.date_rdv)}</strong> est complète pour le moment. Tu es sur la liste d'attente.</p>
        <p style="margin:0 0 20px;">Si une place se libère, nous te prévenons tout de suite par e-mail : ton inscription sera alors confirmée automatiquement.</p>
        <p style="margin:0 0 8px;">Tu ne veux plus attendre ?</p>
        ${bouton('Me retirer de la liste', suivi(e.token), 'line')}`,
    }),
  };
}

export function etudiantRappel(e: Etu): Mail {
  const total = e.nb_personnes * 5;
  return {
    to: e.email,
    subject: 'Rappel : demain, épicerie étudiante !',
    html: page({
      titre: 'C\'est demain !',
      bandeau: '#4d9aa8',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(e.prenom)},</p>
        <p style="margin:0 0 16px;">Nous t'attendons demain pour l'épicerie étudiante.</p>
        ${encadre([`<strong>${esc(e.date_rdv)}</strong>`, esc(ADRESSE)])}
        ${encadre([`<strong>${total}€ en liquide</strong> (${e.nb_personnes} × 5€) et un sac.`], '#eef0c9')}
        <p style="margin:0 0 8px;">Finalement, tu ne peux pas venir ? Préviens-nous, c'est important :</p>
        ${bouton('Je ne peux plus venir', suivi(e.token), 'line')}`,
    }),
  };
}

// ── Bénévoles ───────────────────────────────────────────────────────────
type Cr = { debut: string; fin: string; note: string; categorie: { nom: string; lieu: string; consignes: string } };
type Ben = { id: string; prenom: string; nom: string; email: string; telephone: string; message: string; token: string; note_admin?: string };

const quand = (c: Cr) => `${majuscule(jourLong(new Date(c.debut)))}, de ${heure(new Date(c.debut))} à ${heure(new Date(c.fin))}`;
const recap = (c: Cr) => encadre([`<strong>${esc(c.categorie.nom)}</strong>`, esc(quand(c)), esc(c.categorie.lieu)]);

export function benevoleAConfirmer(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `Confirmez votre inscription · ${c.categorie.nom}`,
    html: page({
      titre: 'Merci ! Il reste une étape',
      bandeau: '#aeb02b',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(b.prenom)},</p>
        <p style="margin:0 0 16px;">Merci de proposer votre aide. Confirmez votre inscription pour ce créneau :</p>
        ${recap(c)}
        ${bouton('Je confirme mon inscription', suivi(b.token), 'navy')}
        <p style="margin:16px 0 0;">Ensuite, un membre de l'équipe valide votre venue et vous recevez un e-mail de validation.</p>`,
      bas: 'Sans confirmation dans les 48 heures, la place est libérée. Vous n\'êtes pas à l\'origine de cette demande ? Ignorez simplement cet e-mail.',
    }),
  };
}

export function adminNouvelleInscription(to: string, b: Ben, c: Cr): Mail {
  return {
    to,
    subject: `À valider : ${b.prenom} ${b.nom} · ${c.categorie.nom}, ${jourLong(new Date(c.debut))}`,
    html: page({
      titre: 'Une inscription bénévole à valider',
      corps: `${recap(c)}
        ${encadre([`<strong>${esc(b.prenom)} ${esc(b.nom)}</strong>`, esc(b.email), esc(b.telephone || 'pas de téléphone'), b.message ? `«&nbsp;${esc(b.message)}&nbsp;»` : ''].filter(Boolean))}
        ${bouton('Valider dans l\'espace admin', `${SITE_URL}/admin.html#benevoles`, 'navy')}`,
    }),
  };
}

export function benevoleValide(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `C'est validé : ${c.categorie.nom}, ${jourLong(new Date(c.debut))}`,
    html: page({
      titre: 'C\'est validé, merci !',
      bandeau: '#aeb02b',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(b.prenom)},</p>
        <p style="margin:0 0 16px;">L'équipe a validé votre venue. Nous comptons sur vous :</p>
        ${recap(c)}
        ${c.categorie.consignes ? encadre([`<strong>Bon à savoir</strong>`, esc(c.categorie.consignes)], '#eef0c9') : ''}
        ${b.note_admin ? `<p style="margin:0 0 16px;">Un mot de l'équipe : «&nbsp;${esc(b.note_admin)}&nbsp;»</p>` : ''}
        <p style="margin:0 0 20px;">Le fichier joint ajoute le créneau à votre agenda. Vous recevrez un rappel la veille.</p>
        <p style="margin:0 0 8px;">Un empêchement ? Prévenez-nous en un clic pour libérer la place :</p>
        ${bouton('Je ne peux plus venir', suivi(b.token), 'line')}`,
      bas: `Une question ? Appelez-nous au ${TEL}.`,
    }),
    attachments: [ics({ uid: `ben-${b.id}`, debut: new Date(c.debut), fin: new Date(c.fin), titre: `Bénévolat ECW : ${c.categorie.nom}`, lieu: c.categorie.lieu, description: `${c.categorie.consignes}\nAnnuler : ${suivi(b.token)}` })],
  };
}

export function benevoleRefuse(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `Votre inscription du ${jourLong(new Date(c.debut))}`,
    html: page({
      titre: 'Merci pour votre proposition',
      bandeau: '#aeb02b',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(b.prenom)},</p>
        <p style="margin:0 0 16px;">Merci d'avoir proposé votre aide pour ce créneau. Cette fois, l'équipe ne peut pas retenir votre inscription :</p>
        ${recap(c)}
        ${b.note_admin ? `<p style="margin:0 0 16px;">Un mot de l'équipe : «&nbsp;${esc(b.note_admin)}&nbsp;»</p>` : ''}
        <p style="margin:0 0 20px;">D'autres créneaux vous attendent peut-être :</p>
        ${bouton('Voir le calendrier des bénévoles', `${SITE_URL}/benevoles/`, 'navy')}`,
      bas: `Une question ? Appelez-nous au ${TEL}.`,
    }),
  };
}

export function benevoleRappel(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `Demain : ${c.categorie.nom} à l'ECW`,
    html: page({
      titre: 'À demain ?',
      bandeau: '#aeb02b',
      corps: `<p style="margin:0 0 16px;">Bonjour ${esc(b.prenom)},</p>
        <p style="margin:0 0 16px;">Petit rappel pour votre créneau de demain :</p>
        ${recap(c)}
        <p style="margin:0 0 12px;">Merci de nous confirmer votre présence :</p>
        ${bouton('Je serai là', suivi(b.token), 'navy')}${bouton('Je ne peux plus venir', suivi(b.token), 'line')}`,
      bas: `Un imprévu de dernière minute ? Appelez-nous au ${TEL}.`,
    }),
  };
}

export function adminAnnulation(to: string, b: Ben, c: Cr, motif: string): Mail {
  return {
    to,
    subject: `Désistement : ${b.prenom} ${b.nom} · ${c.categorie.nom}, ${jourLong(new Date(c.debut))}`,
    html: page({
      titre: 'Un·e bénévole ne pourra pas venir',
      corps: `${recap(c)}
        ${encadre([`<strong>${esc(b.prenom)} ${esc(b.nom)}</strong>`, esc(b.email), esc(b.telephone || ''), esc(motif)])}
        <p style="margin:0 0 16px;">La place est de nouveau ouverte dans le calendrier.</p>
        ${bouton('Ouvrir l\'espace admin', `${SITE_URL}/admin.html#benevoles`, 'navy')}`,
    }),
  };
}

// ── Gazette ─────────────────────────────────────────────────────────────
export function gazetteConfirmer(email: string, token: string): Mail {
  return {
    to: email,
    subject: 'Confirmez votre inscription à la Gazette conviviale',
    html: page({
      titre: 'Recevoir la Gazette conviviale',
      corps: `<p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 20px;">Pour recevoir chaque nouveau numéro de la Gazette conviviale par e-mail (deux fois par an), confirmez votre adresse :</p>
        ${bouton('Je confirme mon inscription', suivi(token), 'navy')}`,
      bas: 'Vous n\'êtes pas à l\'origine de cette demande ? Ignorez cet e-mail : vous ne recevrez rien.',
    }),
  };
}

export function gazetteEnvoi(email: string, token: string, g: { numero: number; titre: string; pdf_url: string; cover_url: string }): Mail {
  const abs = (u: string) => u.startsWith('http') ? u : SITE_URL + u;
  return {
    to: email,
    subject: `La Gazette conviviale N°${g.numero} est parue`,
    html: page({
      titre: `La Gazette conviviale N°${g.numero}`,
      corps: `<p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 20px;">Le nouveau numéro de la Gazette conviviale (${esc(g.titre)}) est disponible : portraits, chroniques, recettes et nouvelles de l'épicerie.</p>
        <p style="margin:0 0 20px;"><a href="${esc(abs(g.pdf_url))}"><img src="${esc(abs(g.cover_url))}" alt="Couverture du N°${g.numero}" width="240" style="display:block;width:240px;max-width:100%;border-radius:2px;"></a></p>
        ${bouton(`Lire le N°${g.numero}`, `${SITE_URL}/qui-sommes-nous/#gazette`, 'navy')}`,
      bas: `Vous recevez cet e-mail car vous êtes inscrit·e à la Gazette. <a href="${suivi(token)}" style="color:#66757b;">Se désinscrire</a>.`,
    }),
  };
}
