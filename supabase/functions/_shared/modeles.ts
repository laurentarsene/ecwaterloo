// ═══════════════════════════════════════════════════════
//  ECW — contenus des e-mails
//  « tu » pour les étudiant·es ; « vous » pour les bénévoles, lutin·es et lecteurs de la Gazette.
//  Chaque e-mail dit clairement : ce qui est prévu, ce qu'il faut faire, et comment se désister.
// ═══════════════════════════════════════════════════════

import { ADRESSE, C, SITE_URL, TEL, bouton, carteDate, esc, etapes, h2, heure, ics, jourLong, lien, note, p, page, Mail } from './mail.ts';

const suivi = (token: string, a = '') => `${SITE_URL}/suivi/?t=${token}${a ? `&a=${a}` : ''}`;
const midi = (iso: string) => new Date(`${iso}T12:00:00Z`);
const jourDe = (iso: string) => new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', weekday: 'long' }).format(midi(iso));
const petit = (html: string) => `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.doux};">${html}</p>`;
const motEquipe = (m?: string) => m ? note(esc(m), C.navy, 'Un mot de l\'équipe') : '';

// ── Épicerie étudiante ──────────────────────────────────────────────────
type Etu = { id: string; prenom: string; email: string; date_rdv: string; date_jour: string | null; nb_personnes: number; token: string; statut?: string; depuis_attente?: boolean };
const POURQUOI_ETU = 'Tu reçois cet e-mail parce que tu t\'es inscrit·e à l\'épicerie étudiante sur ecwaterloo.com.';
const aPrevoir = (e: Etu) => note(`<strong>${e.nb_personnes * 5}&nbsp;€ en liquide</strong> (${e.nb_personnes}&nbsp;×&nbsp;5&nbsp;€) et un sac pour repartir avec tes courses.`, C.teal, 'À prévoir');
const carteEtu = (e: Etu, barre = false) => e.date_jour
  ? carteDate({ quand: midi(e.date_jour), titre: 'Épicerie étudiante', lieu: `${ADRESSE} · pour ${e.nb_personnes} personne${e.nb_personnes > 1 ? 's' : ''}`, couleur: C.teal, itineraire: !barre, barre })
  : note(`<strong>${esc(e.date_rdv)}</strong><br>${ADRESSE}`, C.teal);
const icsEtu = (e: Etu) => e.date_jour ? [ics({ uid: `etu-${e.id}`, debut: new Date(), fin: new Date(), jourEntier: e.date_jour, titre: 'Épicerie étudiante · ECW', lieu: ADRESSE, description: `Pense à ${e.nb_personnes * 5}€ en liquide et à un sac. Un empêchement : ${suivi(e.token, 'annuler')}` })] : undefined;
const desister = (e: Etu, texte: string) => `${h2('Un empêchement ?')}${p(texte)}${bouton('Je ne peux plus venir', suivi(e.token, 'annuler'), 'ligne')}`;

export function etudiantConfirmation(e: Etu): Mail {
  const jour = e.date_jour ? jourDe(e.date_jour) : 'bientôt';
  return {
    to: e.email,
    subject: e.depuis_attente ? `Une place s'est libérée : à ${jour} !` : `C'est confirmé : épicerie étudiante, ${e.date_rdv.toLowerCase()}`,
    html: page({
      titre: e.depuis_attente ? 'Bonne nouvelle, une place s\'est libérée' : `C'est noté, à ${jour}&nbsp;!`,
      apercu: `${e.date_rdv}, ${ADRESSE}. Pense à ${e.nb_personnes * 5}€ en liquide et à un sac.`,
      couleur: C.teal, illustration: 'etudiants', pourquoi: POURQUOI_ETU,
      corps: `${p(`Bonjour ${esc(e.prenom)},`)}
        ${p(e.depuis_attente ? 'Tu étais sur la liste d\'attente : quelqu\'un s\'est désisté, et ta place est maintenant confirmée.' : 'Ton inscription à l\'épicerie étudiante est confirmée. Tu y trouveras des produits frais et de base à petit prix, et une équipe contente de t\'accueillir.')}
        ${carteEtu(e)}
        ${aPrevoir(e)}
        ${p('Tu recevras un rappel la veille. Le fichier joint ajoute la date à ton agenda en un clic.')}
        ${desister(e, 'Préviens-nous dès que tu le sais : ta place ira tout de suite à quelqu\'un sur la liste d\'attente. Une absence sans prévenir empêche de se réinscrire par la suite.')}`,
    }),
    attachments: icsEtu(e),
  };
}

export function etudiantAttente(e: Etu): Mail {
  return {
    to: e.email,
    subject: `Liste d'attente : épicerie étudiante, ${e.date_rdv.toLowerCase()}`,
    html: page({
      titre: 'Tu es sur la liste d\'attente',
      apercu: 'L\'épicerie est complète pour le moment. Si une place se libère, ton inscription est confirmée automatiquement.',
      couleur: C.teal, illustration: 'etudiants', pourquoi: POURQUOI_ETU,
      corps: `${p(`Bonjour ${esc(e.prenom)},`)}
        ${p(`L'épicerie étudiante du <strong>${esc(e.date_rdv.toLowerCase())}</strong> est complète pour le moment. Tu es sur la liste d'attente, dans l'ordre d'arrivée des inscriptions.`)}
        ${note('Dès qu\'une place se libère, ton inscription est <strong>confirmée automatiquement</strong> et tu reçois un e-mail avec tous les détails. Tu n\'as rien d\'autre à faire.', C.teal, 'Comment ça marche')}
        ${h2('Tu ne veux plus attendre ?')}
        ${p('Retire-toi de la liste en un clic : la personne suivante avancera.')}
        ${bouton('Me retirer de la liste', suivi(e.token, 'annuler'), 'ligne')}`,
    }),
  };
}

export function etudiantRappel(e: Etu): Mail {
  return {
    to: e.email,
    subject: 'Demain : épicerie étudiante !',
    html: page({
      titre: 'C\'est demain&nbsp;!',
      apercu: `Nous t'attendons demain, ${ADRESSE}. N'oublie pas ${e.nb_personnes * 5}€ en liquide et un sac.`,
      couleur: C.teal, illustration: 'rappel', pourquoi: POURQUOI_ETU,
      corps: `${p(`Bonjour ${esc(e.prenom)},`)}
        ${p('Petit rappel : nous t\'attendons demain à l\'épicerie étudiante.')}
        ${carteEtu(e)}
        ${aPrevoir(e)}
        ${desister(e, 'Finalement, tu ne peux pas venir ? Préviens-nous maintenant, même au dernier moment : quelqu\'un d\'autre pourra profiter de ta place.')}`,
    }),
  };
}

// La date de l'épicerie change (même mois) : nouvelle date, nouveau fichier agenda
export function etudiantDeplace(e: Etu, ancienne: string, message: string): Mail {
  const attente = e.statut === 'liste_attente';
  return {
    to: e.email,
    subject: `Nouvelle date : épicerie étudiante, ${e.date_rdv.toLowerCase()}`,
    html: page({
      titre: 'L\'épicerie étudiante change de date',
      apercu: `Elle aura lieu le ${e.date_rdv.toLowerCase()} au lieu du ${ancienne.toLowerCase()}. ${attente ? 'Tu restes sur la liste d\'attente.' : 'Ta place est reportée automatiquement.'}`,
      couleur: C.teal, illustration: 'etudiants', pourquoi: POURQUOI_ETU,
      corps: `${p(`Bonjour ${esc(e.prenom)},`)}
        ${p(`L'épicerie étudiante prévue le ${esc(ancienne.toLowerCase())} est déplacée. ${attente ? 'Tu restes sur la liste d\'attente pour la nouvelle date, à la même position.' : '<strong>Ton inscription est reportée automatiquement</strong> : tu n\'as rien à refaire.'}`)}
        ${carteEtu(e)}
        ${motEquipe(message)}
        ${attente ? '' : aPrevoir(e)}
        ${attente ? '' : p('Le fichier joint met ton agenda à jour, et le rappel arrivera la veille de la nouvelle date.')}
        ${desister(e, 'La nouvelle date ne te convient pas ? Libère ta place en un clic, elle ira à quelqu\'un d\'autre. Aucune conséquence pour tes prochaines inscriptions.')}`,
    }),
    attachments: attente ? undefined : icsEtu(e),
  };
}

// L'épicerie du mois est annulée
export function etudiantMoisAnnule(e: Etu, message: string, prochaine: string | null): Mail {
  return {
    to: e.email,
    subject: `Annulée : épicerie étudiante du ${e.date_rdv.toLowerCase()}`,
    html: page({
      titre: 'L\'épicerie étudiante n\'aura pas lieu',
      apercu: `Celle du ${e.date_rdv.toLowerCase()} est annulée. ${prochaine ? `La prochaine : ${prochaine.toLowerCase()}.` : ''}`,
      couleur: C.teal, illustration: 'porte', pourquoi: POURQUOI_ETU,
      corps: `${p(`Bonjour ${esc(e.prenom)},`)}
        ${p('Nous sommes désolé·es : l\'épicerie étudiante prévue ce mois-ci est annulée. Ton inscription est donc annulée elle aussi, <strong>sans aucune conséquence</strong> pour tes prochaines inscriptions.')}
        ${carteEtu(e, true)}
        ${motEquipe(message)}
        ${prochaine ? note(`<strong>${esc(prochaine)}</strong><br>Les inscriptions ouvrent quelques jours avant, sur le site.`, C.teal, 'La prochaine') : ''}
        ${bouton('Voir l\'épicerie étudiante', `${SITE_URL}/etudiants/`)}`,
    }),
  };
}

// ── Bénévoles ───────────────────────────────────────────────────────────
type Cr = { debut: string; fin: string; note?: string; categorie: { nom: string; lieu: string; consignes: string } };
type Ben = { id: string; prenom: string; nom: string; email: string; telephone: string; message: string; token: string; note_admin?: string; statut?: string };
const POURQUOI_BEN = 'Vous recevez cet e-mail parce que vous vous êtes inscrit·e à un créneau bénévole sur ecwaterloo.com.';
const PARCOURS = ['Inscription', 'Votre confirmation', 'Validation par l\'équipe', 'Rappel la veille'];
const horaire = (c: { debut: string; fin: string }) => `de ${heure(new Date(c.debut))} à ${heure(new Date(c.fin))}`;
const carteCr = (c: Cr, barre = false) => carteDate({ quand: new Date(c.debut), titre: c.categorie.nom + (c.note ? ` · ${c.note}` : ''), horaire: horaire(c), lieu: c.categorie.lieu, couleur: C.olive, itineraire: !barre, barre });
const quandCourt = (c: { debut: string }) => jourLong(new Date(c.debut));
const icsBen = (b: Ben, c: Cr) => [ics({ uid: `ben-${b.id}`, debut: new Date(c.debut), fin: new Date(c.fin), titre: `Bénévolat ECW : ${c.categorie.nom}`, lieu: c.categorie.lieu, description: `${c.categorie.consignes}\nUn empêchement : ${suivi(b.token, 'annuler')}` })];
const consignes = (c: Cr) => c.categorie.consignes ? note(esc(c.categorie.consignes), C.olive, 'Bon à savoir') : '';

export function benevoleAConfirmer(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `Confirmez votre inscription : ${c.categorie.nom}, ${quandCourt(c)}`,
    html: page({
      titre: 'Merci&nbsp;! Il reste un clic',
      apercu: `Confirmez votre inscription pour ${c.categorie.nom}, ${quandCourt(c)} ${horaire(c)}.`,
      couleur: C.olive, illustration: 'benevoles',
      pourquoi: 'Vous recevez cet e-mail parce que cette adresse a été utilisée pour s\'inscrire à un créneau bénévole sur ecwaterloo.com. Si ce n\'est pas vous, ignorez-le : sans confirmation, l\'inscription expire d\'elle-même.',
      corps: `${p(`Bonjour ${esc(b.prenom)},`)}
        ${p('Merci de proposer votre aide ! Pour être sûr·es que c\'est bien vous, confirmez votre inscription :')}
        ${carteCr(c)}
        ${bouton('Je confirme mon inscription', suivi(b.token))}
        ${petit('Sans confirmation dans les 48 heures, la place est libérée pour quelqu\'un d\'autre.')}
        ${h2('Et ensuite ?')}
        ${etapes(PARCOURS, 1)}
        ${p('Après votre confirmation, un membre de l\'équipe valide votre venue. Vous recevez alors un e-mail avec le créneau à ajouter à votre agenda, puis un petit rappel la veille.')}`,
    }),
  };
}

export function benevoleValide(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `C'est validé : ${c.categorie.nom}, ${quandCourt(c)}`,
    html: page({
      titre: 'C\'est validé, merci&nbsp;!',
      apercu: `Nous comptons sur vous ${quandCourt(c)} ${horaire(c)}. Le créneau est en pièce jointe pour votre agenda.`,
      couleur: C.olive, illustration: 'benevoles', pourquoi: POURQUOI_BEN,
      corps: `${p(`Bonjour ${esc(b.prenom)},`)}
        ${p('L\'équipe a validé votre venue. Nous comptons sur vous :')}
        ${carteCr(c)}
        ${motEquipe(b.note_admin)}
        ${consignes(c)}
        ${etapes(PARCOURS, 3)}
        ${p('Le fichier joint ajoute le créneau à votre agenda. Vous recevrez un rappel la veille, avec un bouton pour confirmer votre présence.')}
        ${h2('Un empêchement ?')}
        ${p('Prévenez-nous dès que possible : la place est libérée et l\'équipe est avertie tout de suite.')}
        ${bouton('Je ne peux plus venir', suivi(b.token, 'annuler'), 'ligne')}`,
    }),
    attachments: icsBen(b, c),
  };
}

export function benevoleRefuse(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `Votre inscription du ${quandCourt(c)}`,
    html: page({
      titre: 'Merci pour votre proposition',
      apercu: 'Cette fois, l\'équipe ne peut pas retenir votre inscription. D\'autres créneaux vous attendent peut-être.',
      couleur: C.olive, illustration: 'equipe', pourquoi: POURQUOI_BEN,
      corps: `${p(`Bonjour ${esc(b.prenom)},`)}
        ${p('Merci d\'avoir proposé votre aide. Pour ce créneau-ci, l\'équipe ne peut pas retenir votre inscription : il est peut-être déjà bien rempli, ou demande une expérience particulière.')}
        ${carteCr(c, true)}
        ${motEquipe(b.note_admin)}
        ${p('Votre envie d\'aider compte beaucoup pour nous. D\'autres créneaux ont sûrement besoin de vous :')}
        ${bouton('Voir le calendrier des bénévoles', `${SITE_URL}/benevoles/`)}`,
    }),
  };
}

export function benevoleRappel(b: Ben, c: Cr): Mail {
  return {
    to: b.email,
    subject: `Demain : ${c.categorie.nom} à l'Espace Convivial`,
    html: page({
      titre: 'À demain&nbsp;?',
      apercu: `Votre créneau ${c.categorie.nom} a lieu demain ${horaire(c)}. Un clic pour confirmer votre présence.`,
      couleur: C.olive, illustration: 'rappel', pourquoi: POURQUOI_BEN,
      corps: `${p(`Bonjour ${esc(b.prenom)},`)}
        ${p('Petit rappel pour votre créneau de demain :')}
        ${carteCr(c)}
        ${consignes(c)}
        ${p('Un clic pour nous dire que vous serez là : l\'équipe pourra s\'organiser sereinement.')}
        ${bouton('Je serai là', suivi(b.token, 'presence'))}
        ${bouton('Je ne peux plus venir', suivi(b.token, 'annuler'), 'ligne')}
        ${petit(`Un imprévu de dernière minute ? Appelez-nous au ${TEL}.`)}`,
    }),
  };
}

// Le créneau change de jour ou d'heure
export function benevoleDeplace(b: Ben & { statut: string }, c: Cr, avant: { debut: string; fin: string }, message: string): Mail {
  const valide = b.statut === 'valide';
  return {
    to: b.email,
    subject: `Nouvel horaire : ${c.categorie.nom}, ${quandCourt(c)}`,
    html: page({
      titre: 'Votre créneau change',
      apercu: `${c.categorie.nom} : ${quandCourt(c)} ${horaire(c)}, au lieu du ${quandCourt(avant)}.`,
      couleur: C.olive, illustration: 'benevoles', pourquoi: POURQUOI_BEN,
      corps: `${p(`Bonjour ${esc(b.prenom)},`)}
        ${p('Le créneau pour lequel vous êtes inscrit·e est déplacé. Votre place est gardée sur la nouvelle date :')}
        ${carteDate({ quand: new Date(avant.debut), titre: 'Avant', horaire: horaire(avant), couleur: C.olive, barre: true })}
        ${carteCr(c)}
        ${motEquipe(message)}
        ${b.statut === 'a_confirmer'
          ? `${p('Votre inscription n\'est pas encore confirmée. Si cette nouvelle date vous convient, confirmez-la :')}${bouton('Je confirme mon inscription', suivi(b.token))}`
          : p(valide ? 'Votre venue reste validée. Le fichier joint met votre agenda à jour, et le rappel arrivera la veille de la nouvelle date.' : 'Votre inscription reste en attente de validation par l\'équipe : vous recevrez un e-mail.')}
        ${h2('Pas disponible à ce moment-là ?')}
        ${p('Dites-le-nous en un clic : la place sera libérée, sans souci.')}
        ${bouton('Je ne peux pas venir', suivi(b.token, 'annuler'), 'ligne')}`,
    }),
    attachments: valide ? icsBen(b, c) : undefined,
  };
}

// Le créneau est supprimé
export function benevoleCreneauAnnule(b: Ben, c: Cr, message: string): Mail {
  return {
    to: b.email,
    subject: `Annulé : ${c.categorie.nom}, ${quandCourt(c)}`,
    html: page({
      titre: 'Ce créneau est annulé',
      apercu: `Le créneau ${c.categorie.nom} du ${quandCourt(c)} n'aura finalement pas lieu.`,
      couleur: C.olive, illustration: 'porte', pourquoi: POURQUOI_BEN,
      corps: `${p(`Bonjour ${esc(b.prenom)},`)}
        ${p('Le créneau pour lequel vous vous étiez inscrit·e n\'aura finalement pas lieu. Vous n\'avez rien à faire. Merci beaucoup d\'avoir proposé votre aide.')}
        ${carteCr(c, true)}
        ${motEquipe(message)}
        ${p('D\'autres créneaux ont besoin de monde :')}
        ${bouton('Voir le calendrier des bénévoles', `${SITE_URL}/benevoles/`)}`,
    }),
  };
}

// ── Pour l'équipe ───────────────────────────────────────────────────────
const contact = (b: { prenom: string; nom: string; email?: string | null; telephone?: string | null; message?: string }) =>
  note([`<strong>${esc(b.prenom)} ${esc(b.nom)}</strong>`, b.email ? `<a href="mailto:${esc(b.email)}" style="color:${C.encre};">${esc(b.email)}</a>` : '', b.telephone ? `<a href="tel:${esc(b.telephone)}" style="color:${C.encre};">${esc(b.telephone)}</a>` : '', b.message ? `<em>«&nbsp;${esc(b.message)}&nbsp;»</em>` : ''].filter(Boolean).join('<br>'), C.navy);
const POURQUOI_ADMIN = 'Vous recevez cette alerte parce que cette adresse est indiquée dans l\'espace admin (Réglages › Adresse qui reçoit les alertes).';

export function adminNouvelleInscription(to: string, b: Ben, c: Cr): Mail {
  return {
    to,
    subject: `À valider : ${b.prenom} ${b.nom} · ${c.categorie.nom}, ${quandCourt(c)}`,
    html: page({
      titre: 'Une inscription bénévole à valider',
      apercu: `${b.prenom} ${b.nom} a confirmé son adresse pour ${c.categorie.nom}, ${quandCourt(c)}. Il reste à valider sa venue.`,
      pourquoi: POURQUOI_ADMIN,
      corps: `${p(`<strong>${esc(b.prenom)} ${esc(b.nom)}</strong> vient de confirmer son adresse e-mail. Tant que vous n'avez pas validé sa venue, la personne ne sait pas si elle est attendue.`)}
        ${carteCr(c)}
        ${contact(b)}
        ${bouton('Valider ou refuser', `${SITE_URL}/admin.html#benevoles`)}
        ${petit('Dans l\'espace admin, un petit mot peut accompagner l\'e-mail de validation ou de refus.')}`,
    }),
  };
}

export function adminAnnulation(to: string, b: Ben, c: Cr, motif: string): Mail {
  return {
    to,
    subject: `Désistement : ${b.prenom} ${b.nom} · ${c.categorie.nom}, ${quandCourt(c)}`,
    html: page({
      titre: 'Un·e bénévole ne pourra pas venir',
      apercu: `${b.prenom} ${b.nom} s'est désisté·e de ${c.categorie.nom}, ${quandCourt(c)}. La place est de nouveau ouverte.`,
      pourquoi: POURQUOI_ADMIN,
      corps: `${p(`<strong>${esc(b.prenom)} ${esc(b.nom)}</strong> s'est désisté·e (${esc(motif.toLowerCase().replace(/\.$/, ''))}). La place est de nouveau ouverte sur le calendrier public.`)}
        ${carteCr(c)}
        ${contact(b)}
        ${bouton('Ouvrir l\'agenda', `${SITE_URL}/admin.html`)}`,
    }),
  };
}

// ── Lutins de Noël ──────────────────────────────────────────────────────
type Lutin = { prenom: string; nom: string; email?: string | null; telephone?: string | null; nb_lettres: number };

export function lutinMerci(l: Lutin): Mail {
  const n = l.nb_lettres, plus = n > 1;
  return {
    to: l.email!,
    subject: 'Merci, tu es lutin·e de Noël !',
    html: page({
      titre: 'Merci de devenir lutin·e de Noël&nbsp;!',
      apercu: `Ton inscription est bien reçue : ${n} lettre${plus ? 's' : ''} d'enfant${plus ? 's' : ''} t'attend${plus ? 'ent' : ''}. Nous revenons vers toi très vite.`,
      couleur: C.coral, illustration: 'lutins',
      pourquoi: 'Tu reçois cet e-mail parce que tu t\'es inscrit·e comme lutin·e de Noël sur ecwaterloo.com.',
      corps: `${p(`Bonjour ${esc(l.prenom)},`)}
        ${p(`Merci ! Ton inscription est bien reçue : tu vas offrir un peu de magie à <strong>${n} enfant${plus ? 's' : ''}</strong> de l'épicerie.`)}
        ${etapes(['Inscription', 'Tu reçois la lettre', 'Tu trouves le cadeau', 'Tu le déposes à l\'épicerie'], 1, C.coral)}
        ${note(`Nous t'envoyons ${plus ? 'les lettres' : 'la lettre'} au Père Noël ${l.telephone ? 'par WhatsApp' : 'par e-mail'}. Ensuite, tu déposes le cadeau emballé à l'épicerie, avec le prénom de l'enfant : nous le lui remettons.`, C.coral, 'Et maintenant ?')}
        ${p(`Le lieu de dépôt : ${ADRESSE}. Une question, ou un changement dans le nombre de lettres ? Réponds simplement à cet e-mail.`)}
        ${bouton('Voir l\'opération sur le site', `${SITE_URL}/aider/#lutins`)}`,
    }),
  };
}

export function adminNouveauLutin(to: string, l: Lutin): Mail {
  return {
    to,
    subject: `Nouveau lutin : ${l.prenom} ${l.nom} · ${l.nb_lettres} lettre${l.nb_lettres > 1 ? 's' : ''}`,
    html: page({
      titre: 'Une nouvelle inscription de lutin·e',
      apercu: `${l.prenom} ${l.nom} demande ${l.nb_lettres} lettre${l.nb_lettres > 1 ? 's' : ''}.`,
      couleur: C.coral, pourquoi: POURQUOI_ADMIN,
      corps: `${p(`<strong>${esc(l.prenom)} ${esc(l.nom)}</strong> vient de s'inscrire comme lutin·e de Noël et demande <strong>${l.nb_lettres} lettre${l.nb_lettres > 1 ? 's' : ''}</strong>.${l.email ? ' Un e-mail de remerciement lui est parti, qui annonce que nous reprenons contact.' : ' Pas d\'adresse e-mail : il faut l\'appeler.'}`)}
        ${contact(l)}
        ${bouton('Ouvrir la liste des lutins', `${SITE_URL}/admin.html#lutins`)}`,
    }),
  };
}

// ── Gazette ─────────────────────────────────────────────────────────────
const POURQUOI_GAZ = (token: string) => `Vous recevez cet e-mail parce que vous êtes abonné·e à la Gazette conviviale. ${lien('Se désinscrire', suivi(token))} en un clic.`;

export function gazetteConfirmer(email: string, token: string): Mail {
  return {
    to: email,
    subject: 'Confirmez votre abonnement à la Gazette conviviale',
    html: page({
      titre: 'Un clic pour recevoir la Gazette',
      apercu: 'Confirmez votre adresse pour recevoir chaque nouveau numéro, deux fois par an.',
      couleur: C.navy, illustration: 'gazette',
      pourquoi: 'Quelqu\'un (vous, sans doute) a demandé à recevoir la Gazette conviviale à cette adresse. Si ce n\'est pas vous, ignorez cet e-mail : vous ne recevrez rien.',
      corps: `${p('Bonjour,')}
        ${p('La Gazette conviviale, c\'est le journal de l\'Espace Convivial : des portraits de bénévoles et d\'habitué·es, des chroniques, des idées de cuisine et des nouvelles de l\'épicerie. Deux numéros par an, rien de plus.')}
        ${p('Pour la recevoir par e-mail, confirmez votre adresse :')}
        ${bouton('Je confirme mon abonnement', suivi(token))}`,
    }),
  };
}

export function gazetteEnvoi(email: string, token: string, g: { numero: number; titre: string; pdf_url: string; cover_url: string }): Mail {
  const abs = (u: string) => u.startsWith('http') ? u : SITE_URL + u;
  return {
    to: email,
    subject: `La Gazette conviviale N°${g.numero} est parue`,
    headers: { 'List-Unsubscribe': `<${suivi(token)}>` },
    html: page({
      titre: `La Gazette conviviale N°${g.numero}`,
      apercu: `Le numéro ${g.titre.toLowerCase()} est là : portraits, chroniques, recettes et nouvelles de l'épicerie.`,
      couleur: C.navy, pourquoi: POURQUOI_GAZ(token),
      corps: `${p('Bonjour,')}
        ${p(`Le nouveau numéro de la Gazette conviviale (${esc(g.titre)}) est paru : portraits de bénévoles et d'habitué·es, chroniques, recettes et nouvelles de l'épicerie. Bonne lecture !`)}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td><a href="${esc(abs(g.pdf_url))}"><img src="${esc(abs(g.cover_url))}" alt="Couverture de la Gazette N°${g.numero}" width="260" style="display:block;width:260px;max-width:100%;height:auto;border:1px solid ${C.ligne};border-radius:4px;"></a></td></tr></table>
        ${bouton(`Lire le N°${g.numero} en ligne`, `${SITE_URL}/qui-sommes-nous/#gazette`)}
        ${petit(`Vous préférez le PDF ? ${lien('Le télécharger', abs(g.pdf_url))}. La version papier est aussi disponible à l'épicerie.`)}`,
    }),
  };
}
