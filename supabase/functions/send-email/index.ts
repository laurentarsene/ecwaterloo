// ═══════════════════════════════════════════════════════
//  ECW — Edge Function : email de confirmation
//  Déployer : supabase functions deploy send-email
//  Secret requis : RESEND_API_KEY
// ═══════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_KEY  = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL  = 'Espace Convivial de Waterloo <noreply@ecwaterloo.com>';
const REPLY_TO    = 'info@ecwaterloo.com';
const ADRESSE     = 'Rue de la Station 139A, 1410 Waterloo';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { type, data } = await req.json();

    let subject: string;
    let html: string;

    if (type === 'confirmation') {
      subject = `✅ Inscription confirmée — Épicerie étudiante · ${data.date_rdv}`;
      html    = confirmationHtml(data);
    } else {
      return new Response(JSON.stringify({ error: 'type inconnu' }), { status: 400, headers: CORS });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:     FROM_EMAIL,
        reply_to: REPLY_TO,
        to:       [data.email],
        subject,
        html,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ ok: res.ok, result }), {
      status: res.ok ? 200 : 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

// ── Template : confirmation ──────────────────────────────────────────────────
function confirmationHtml(d: any): string {
  const montant = d.nb_personnes * 5;
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:4px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:#1c3038;padding:36px 40px 28px;">
    <p style="margin:0 0 6px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.45);">Espace Convivial de Waterloo</p>
    <h1 style="margin:0;font-size:30px;font-weight:900;color:#fff;text-transform:uppercase;line-height:1.05;">Inscription<br>confirmée ✓</h1>
  </td></tr>

  <!-- Date badge -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef5d0;border-radius:3px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1c3038;">📅 ${d.date_rdv}</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(28,48,56,.55);">${ADRESSE}</p>
    </td></tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 40px;">
    <p style="margin:0 0 14px;font-size:15px;color:#1c3038;">Bonjour <strong>${d.prenom}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(28,48,56,.6);line-height:1.65;">
      Ton inscription pour l'épicerie étudiante est confirmée.<br>
      Tu viens pour <strong style="color:#1c3038;">${d.nb_personnes} personne${d.nb_personnes > 1 ? 's' : ''}</strong>.
    </p>

    <!-- 5€ reminder -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#c9c918;border-radius:3px;margin-bottom:20px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#1c3038;">💛 N'oublie pas tes ${montant}€ !</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(28,48,56,.65);">${montant}€ en cash (${d.nb_personnes} × 5€), à apporter impérativement le jour J.</p>
    </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:rgba(28,48,56,.5);line-height:1.6;">
      Tu recevras un rappel la veille. En cas d'empêchement, merci de nous prévenir à l'avance à <a href="mailto:${REPLY_TO}" style="color:#1c3038;">${REPLY_TO}</a>.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f7;padding:18px 40px;border-top:1px solid rgba(28,48,56,.07);">
    <p style="margin:0;font-size:11px;color:rgba(28,48,56,.35);line-height:1.6;">
      Espace Convivial de Waterloo · ASBL 100% bénévole<br>${ADRESSE}
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
