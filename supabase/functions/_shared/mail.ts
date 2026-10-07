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
export type Mail = { to: string; subject: string; html: string; attachments?: Piece[] };

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
  const corps = (x: Mail) => ({ from: FROM, reply_to: REPLY_TO, to: [x.to], subject: x.subject, html: x.html, ...(x.attachments ? { attachments: x.attachments } : {}) });
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

// ── Gabarit ────────────────────────────────────────────────────────────
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function bouton(label: string, href: string, couleur: 'navy' | 'coral' | 'line' = 'navy'): string {
  const st = couleur === 'coral' ? 'background:#f26d5f;color:#13232a;' : couleur === 'line' ? 'background:#ffffff;color:#1f3038;border:2px solid #1f3038;' : 'background:#1f3038;color:#ffffff;';
  return `<a href="${esc(href)}" style="display:inline-block;${st}padding:14px 22px;border-radius:4px;font-weight:600;font-size:15px;text-decoration:none;margin:0 8px 8px 0;">${esc(label)}</a>`;
}

export function encadre(lignes: string[], fond = '#f2f5f5'): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${fond};border-radius:4px;margin:4px 0 20px;"><tr><td style="padding:16px 18px;font-size:15px;line-height:1.6;color:#1f3038;">${lignes.join('<br>')}</td></tr></table>`;
}

export function page(o: { titre: string; bandeau?: string; corps: string; bas?: string }): string {
  const couleur = o.bandeau || '#1f3038';
  const texteBandeau = couleur === '#1f3038' ? '#ffffff' : '#13232a';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.titre)}</title></head>
<body style="margin:0;padding:0;background:#f2f5f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f3038;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:6px;overflow:hidden;">
  <tr><td style="background:${couleur};padding:30px 32px 26px;">
    <p style="margin:0 0 10px;font-size:13px;color:${texteBandeau};opacity:.75;">Espace Convivial de Waterloo</p>
    <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:400;letter-spacing:-.5px;color:${texteBandeau};">${o.titre}</h1>
  </td></tr>
  <tr><td style="padding:28px 32px 12px;font-size:16px;line-height:1.6;color:#33454d;">${o.corps}</td></tr>
  ${o.bas ? `<tr><td style="padding:0 32px 24px;font-size:14px;line-height:1.6;color:#66757b;">${o.bas}</td></tr>` : ''}
  <tr><td style="background:#f7f9f9;padding:18px 32px;border-top:1px solid #e3e9ea;font-size:12px;line-height:1.6;color:#66757b;">
    Espace Convivial de Waterloo · ASBL 100% bénévole<br>${ADRESSE} · ${TEL} · <a href="mailto:${REPLY_TO}" style="color:#66757b;">${REPLY_TO}</a>
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
