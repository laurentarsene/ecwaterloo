// ═══════════════════════════════════════════════════════
//  ECW — envoi des e-mails et gabarit commun
//  Resend en production ; boîte de test (table dev_outbox) en local avec MAIL_OUTBOX=1
// ═══════════════════════════════════════════════════════

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2';

export const SITE_URL  = (Deno.env.get('SITE_URL') || 'https://ecwaterloo.com').replace(/\/$/, '');
export const FROM      = 'Espace Convivial de Waterloo <noreply@ecwaterloo.com>';
export const REPLY_TO  = 'infos.ecwaterloo@gmail.com';
export const ADRESSE   = 'Rue de la Station 139A, 1410 Waterloo';
export const TEL       = '0465 92 73 66';

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}

export type Piece = { filename: string; content: string; content_type?: string };  // content en base64
export type Mail = { to: string; subject: string; html: string; attachments?: Piece[]; headers?: Record<string, string> };

export async function envoyer(m: Mail | Mail[]): Promise<void> {
  const mails = Array.isArray(m) ? m : [m];
  if (!mails.length) return;
  if (Deno.env.get('MAIL_OUTBOX') === '1') {
    const { error } = await adminClient().from('dev_outbox').insert(
      mails.map(x => ({ destinataire: x.to, sujet: x.subject, html: x.html, pieces: x.attachments ?? null })));
    if (error) throw new Error('outbox: ' + error.message);
    return;
  }
  const key = Deno.env.get('RESEND_API_KEY')!;
  // Version texte jointe à chaque e-mail : meilleure délivrabilité, et lisible partout
  const corps = (x: Mail) => ({ from: FROM, reply_to: REPLY_TO, to: [x.to], subject: x.subject, html: x.html, text: enTexte(x.html), ...(x.headers ? { headers: x.headers } : {}), ...(x.attachments ? { attachments: x.attachments } : {}) });
  // Un seul e-mail : endpoint simple (pièces jointes possibles). Plusieurs : envoi groupé par 100.
  if (mails.length === 1) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corps(mails[0])) });
    if (!r.ok) throw new Error('resend: ' + (await r.text()));
    return;
  }
  for (let i = 0; i < mails.length; i += 100) {
    const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mails.slice(i, i + 100).map(corps)) });
    if (!r.ok) throw new Error('resend batch: ' + (await r.text()));
  }
}

export function enTexte(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, '').replace(/<div class="apercu"[\s\S]*?<\/div>/, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => { const l = t.replace(/<[^>]+>/g, '').trim(); return l && !href.startsWith('mailto:') && !href.startsWith('tel:') ? `${l} : ${href}` : l; })
    .replace(/<(br|\/p|\/h1|\/h2|\/tr|\/li)[^>]*>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rarr;/g, '→')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Gabarit ────────────────────────────────────────────────────────────
// Couleurs du site ; chaque public a la sienne
export const C = {
  encre: '#1f3038', texte: '#3b4c53', doux: '#66757b', fond: '#eef2f2', ligne: '#e1e8e9',
  teal: '#4d9aa8', olive: '#aeb02b', coral: '#f26d5f', navy: '#1f3038', or: '#e8b53a',
};
const TEINTE: Record<string, string> = { '#4d9aa8': '#e3f0f2', '#aeb02b': '#f0f1d3', '#f26d5f': '#fde5e1', '#1f3038': '#e6ecec', '#e8b53a': '#fbf0d3' };
const POLICE = "'Hanken Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
export const ITINERAIRE = 'https://www.google.com/maps/dir/?api=1&destination=Rue+de+la+Station+139A,+1410+Waterloo';
export type Illustration = 'etudiants' | 'benevoles' | 'gazette' | 'lutins' | 'rappel' | 'equipe' | 'porte';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const p = (html: string, marge = 16) => `<p style="margin:0 0 ${marge}px;font-size:16px;line-height:1.6;color:${C.texte};">${html}</p>`;
export const h2 = (t: string) => `<h2 style="margin:28px 0 10px;font-size:17px;line-height:1.3;font-weight:600;color:${C.encre};">${t}</h2>`;

// Bouton « blindé » (tables) : s'affiche aussi dans Outlook
export function bouton(label: string, href: string, style: 'plein' | 'ligne' = 'plein', couleur = C.encre): string {
  const plein = style === 'plein';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;"><tr><td style="border-radius:8px;background:${plein ? couleur : '#ffffff'};${plein ? '' : `border:2px solid ${couleur};`}">
    <a href="${esc(href)}" style="display:inline-block;padding:${plein ? '15px 26px' : '13px 24px'};font-family:${POLICE};font-size:16px;font-weight:600;line-height:1.2;color:${plein ? '#ffffff' : couleur};text-decoration:none;border-radius:8px;">${esc(label)}</a></td></tr></table>`;
}
export const lien = (label: string, href: string) => `<a href="${esc(href)}" style="color:${C.encre};font-weight:600;text-decoration:underline;">${esc(label)}</a>`;

// Encadré coloré, avec un titre facultatif
export function note(html: string, couleur = C.navy, titre = ''): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
    <td width="4" style="background:${couleur};border-radius:4px 0 0 4px;"></td>
    <td style="background:${TEINTE[couleur] || '#f2f5f5'};padding:14px 18px;border-radius:0 8px 8px 0;font-size:15px;line-height:1.6;color:${C.encre};">${titre ? `<strong style="display:block;margin-bottom:2px;">${titre}</strong>` : ''}${html}</td></tr></table>`;
}

// Carte de rendez-vous : un bloc « calendrier » (mois, jour) + le détail
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export function carteDate(o: { quand: Date; titre: string; horaire?: string; lieu?: string; couleur?: string; barre?: boolean; itineraire?: boolean }): string {
  const couleur = o.couleur || C.navy;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'numeric' }).formatToParts(o.quand).map(x => [x.type, x.value]));
  const barre = o.barre ? 'text-decoration:line-through;' : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${C.ligne};border-radius:12px;border-collapse:separate;${o.barre ? 'opacity:.6;' : ''}"><tr>
    <td width="84" valign="top" style="padding:14px 0 14px 14px;">
      <table role="presentation" width="70" cellpadding="0" cellspacing="0" style="border-radius:10px;background:${couleur};"><tr><td align="center" style="padding:9px 0 3px;font-size:13px;font-weight:600;color:#ffffff;${barre}">${MOIS_COURTS[Number(parts.month) - 1]}</td></tr><tr><td align="center" style="padding:0 0 10px;font-size:30px;line-height:1;font-weight:300;color:#ffffff;${barre}">${Number(parts.day)}</td></tr></table>
    </td>
    <td valign="middle" style="padding:14px 16px 14px 12px;font-size:15px;line-height:1.5;color:${C.texte};">
      <strong style="display:block;font-size:17px;color:${C.encre};${barre}">${esc(o.titre)}</strong>
      <span style="${barre}">${majuscule(parts.weekday)} ${Number(parts.day)} ${MOIS_LONGS[Number(parts.month) - 1]}${o.horaire ? `, ${esc(o.horaire)}` : ''}</span>
      ${o.lieu ? `<br><span style="color:${C.doux};">${esc(o.lieu)}</span>` : ''}
      ${o.itineraire ? `<br><a href="${ITINERAIRE}" style="color:${C.encre};font-weight:600;font-size:14px;">Itinéraire</a>` : ''}
    </td></tr></table>`;
}
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Où en est la personne : étapes passées (✓), étape en cours (cerclée), étapes à venir
export function etapes(liste: string[], enCours: number, couleur = C.olive): string {
  const cell = (t: string, k: number) => {
    const fait = k < enCours, courant = k === enCours;
    const rond = fait ? `background:${couleur};color:#ffffff;` : courant ? `background:#ffffff;color:${C.encre};border:2px solid ${couleur};` : `background:#ffffff;color:#9aa7ab;border:2px solid ${C.ligne};`;
    return `<td valign="top" align="center" width="${Math.floor(100 / liste.length)}%" style="padding:0 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="30" height="30" style="width:30px;height:30px;border-radius:15px;font-size:14px;font-weight:600;line-height:${fait ? 30 : 26}px;${rond}">${fait ? '✓' : k + 1}</td></tr></table>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.35;color:${fait || courant ? C.encre : '#9aa7ab'};${courant ? 'font-weight:600;' : ''}">${t}</p></td>`;
  };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px;"><tr>${liste.map(cell).join('')}</tr></table>`;
}

export function page(o: { titre: string; apercu: string; corps: string; couleur?: string; illustration?: Illustration; pourquoi?: string }): string {
  const couleur = o.couleur || C.navy;
  const img = o.illustration ? `${SITE_URL}/assets/images/email/${o.illustration}.png` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(o.titre)}</title>
<style>@media (max-width:620px){.carte{border-radius:0!important}.int{padding-left:22px!important;padding-right:22px!important}h1{font-size:26px!important}}a{color:${C.encre}}</style></head>
<body style="margin:0;padding:0;background:${C.fond};font-family:${POLICE};color:${C.encre};-webkit-text-size-adjust:100%;">
<div class="apercu" style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(o.apercu)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond};"><tr><td align="center" style="padding:24px 0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td class="int" style="padding:0 28px 18px;"><a href="${SITE_URL}/"><img src="${SITE_URL}/assets/images/ecw-logo.png" width="128" alt="Espace Convivial de Waterloo" style="display:block;width:128px;height:auto;border:0;"></a></td></tr>
  <tr><td>
    <table role="presentation" class="carte" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
      ${img ? `<tr><td align="center" style="background:${TEINTE[couleur] || '#f2f5f5'};padding:28px 24px 0;"><img src="${img}" height="170" alt="" style="display:block;height:170px;width:auto;max-width:100%;border:0;"></td></tr>` : `<tr><td style="background:${couleur};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>`}
      <tr><td class="int" style="padding:32px 40px 8px;">
        <h1 style="margin:0 0 18px;font-size:30px;line-height:1.15;font-weight:400;letter-spacing:-.5px;color:${C.encre};">${o.titre}</h1>
        ${o.corps}
      </td></tr>
      <tr><td class="int" style="padding:8px 40px 32px;font-size:15px;line-height:1.6;color:${C.texte};">À bientôt,<br><strong style="color:${C.encre};">L'équipe de l'Espace Convivial</strong></td></tr>
    </table>
  </td></tr>
  <tr><td class="int" style="padding:22px 28px 0;font-size:13px;line-height:1.65;color:${C.doux};">
    ${o.pourquoi ? `${o.pourquoi}<br><br>` : ''}
    <strong style="color:${C.texte};">Espace Convivial de Waterloo</strong> · ASBL 100&nbsp;% bénévole<br>
    ${ADRESSE} · <a href="tel:+32465927366" style="color:${C.doux};">${TEL}</a><br>
    <a href="${SITE_URL}/" style="color:${C.doux};">ecwaterloo.com</a> · <a href="mailto:${REPLY_TO}" style="color:${C.doux};">${REPLY_TO}</a> · Une question&nbsp;? Il suffit de répondre à cet e-mail.
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ── Agenda (.ics) ──────────────────────────────────────────────────────
const ics2 = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsTxt = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
export function ics(o: { uid: string; debut: Date; fin: Date; titre: string; lieu: string; description: string; jourEntier?: string }): Piece {
  // jourEntier : 'AAAA-MM-JJ' pour un événement sur la journée (heure non fixée)
  const quand = o.jourEntier
    ? [`DTSTART;VALUE=DATE:${o.jourEntier.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${new Date(Date.parse(o.jourEntier) + 864e5).toISOString().slice(0, 10).replace(/-/g, '')}`]
    : [`DTSTART:${ics2(o.debut)}`, `DTEND:${ics2(o.fin)}`];
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ECW//ecwaterloo.com//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${o.uid}@ecwaterloo.com`, `DTSTAMP:${ics2(new Date())}`, ...quand,
    `SUMMARY:${icsTxt(o.titre)}`, `LOCATION:${icsTxt(o.lieu)}`, `DESCRIPTION:${icsTxt(o.description)}`, 'END:VEVENT', 'END:VCALENDAR'];
  return { filename: 'ecw.ics', content: btoa(unescape(encodeURIComponent(lignes.join('\r\n')))), content_type: 'text/calendar' };
}

// Date « AAAA-MM-JJ » à Bruxelles (heure d'été comme d'hiver)
export const dateBxl = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// Dates lisibles, heure de Bruxelles
export const jourLong = (d: Date) => new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
export const heure = (d: Date) => { const p = new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d); const h = +p.find(x => x.type === 'hour')!.value, m = p.find(x => x.type === 'minute')!.value; return m === '00' ? `${h}h` : `${h}h${m}`; };
export const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
