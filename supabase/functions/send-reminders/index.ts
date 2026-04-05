// ═══════════════════════════════════════════════════════
//  ECW — Edge Function : rappels automatiques
//  Appelée chaque matin à 8h via pg_cron (voir schema.sql)
//  Déployer : supabase functions deploy send-reminders
//  Secrets requis : RESEND_API_KEY + SUPABASE_SERVICE_ROLE_KEY
// ═══════════════════════════════════════════════════════

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_KEY      = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL      = 'Espace Convivial de Waterloo <noreply@ecwaterloo.com>';
const REPLY_TO        = 'info@ecwaterloo.com';
const ADRESSE         = 'Rue de la Station 139A, 1410 Waterloo';

serve(async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Ne rien faire si demain n'est pas un 1er jeudi du mois
  if (!isFirstThursday(tomorrow)) {
    return new Response(JSON.stringify({ skipped: true, reason: 'pas un 1er jeudi' }), { status: 200 });
  }

  const dateStr = formatDateFr(tomorrow);
  console.log(`Envoi des rappels pour : ${dateStr}`);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Récupérer tous les inscrits confirmés pour cette date
  const { data: inscrits, error } = await sb
    .from('inscriptions_etudiantes')
    .select('*')
    .eq('date_rdv', dateStr)
    .in('statut', ['confirmé', 'rappel_envoyé']); // on renvoie pas si déjà rappelé, sauf sécurité

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const confirmed = (inscrits ?? []).filter(r => r.statut === 'confirmé');
  let sent = 0;

  for (const inscrit of confirmed) {
    try {
      await sendReminderEmail(inscrit, dateStr);

      await sb
        .from('inscriptions_etudiantes')
        .update({ statut: 'rappel_envoyé' })
        .eq('id', inscrit.id);

      sent++;
    } catch (e) {
      console.error(`Erreur rappel pour ${inscrit.email}:`, e);
    }
  }

  console.log(`Rappels envoyés : ${sent}/${confirmed.length}`);
  return new Response(JSON.stringify({ ok: true, sent, total: confirmed.length }), { status: 200 });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function isFirstThursday(date: Date): boolean {
  return date.getDay() === 4 && date.getDate() <= 7;
}

function formatDateFr(date: Date): string {
  const mois = ['janvier','février','mars','avril','mai','juin',
                 'juillet','août','septembre','octobre','novembre','décembre'];
  return `Jeudi ${date.getDate()} ${mois[date.getMonth()]} ${date.getFullYear()}`;
}

async function sendReminderEmail(d: any, dateStr: string): Promise<void> {
  const montant = d.nb_personnes * 5;
  const subject = `⏰ Rappel — Demain à l'épicerie étudiante !`;
  const html    = reminderHtml(d, dateStr, montant);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      reply_to: REPLY_TO,
      to:       [d.email],
      subject,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

// ── Template : rappel ─────────────────────────────────────────────────────────
function reminderHtml(d: any, dateStr: string, montant: number): string {
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
    <h1 style="margin:0;font-size:30px;font-weight:900;color:#fff;text-transform:uppercase;line-height:1.05;">C'est demain ! ⏰</h1>
  </td></tr>

  <!-- Date badge -->
  <tr><td style="padding:28px 40px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef5d0;border-radius:3px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1c3038;">📅 ${dateStr}</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(28,48,56,.55);">${ADRESSE}</p>
    </td></tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 40px;">
    <p style="margin:0 0 16px;font-size:15px;color:#1c3038;">Bonjour <strong>${d.prenom}</strong> 👋</p>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(28,48,56,.6);line-height:1.65;">
      On t'attend <strong style="color:#1c3038;">demain</strong> pour l'épicerie étudiante !
    </p>

    <!-- Checklist -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid rgba(28,48,56,.1);border-radius:3px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:13px 18px;border-bottom:1px solid rgba(28,48,56,.08);">
        <p style="margin:0;font-size:13px;color:#1c3038;">💛 <strong>${montant}€ en cash</strong> — ${d.nb_personnes} pers. × 5€</p>
      </td></tr>
      <tr><td style="padding:13px 18px;border-bottom:1px solid rgba(28,48,56,.08);">
        <p style="margin:0;font-size:13px;color:#1c3038;">📍 <strong>${ADRESSE}</strong></p>
      </td></tr>
      <tr><td style="padding:13px 18px;">
        <p style="margin:0;font-size:12px;color:rgba(28,48,56,.45);">En cas d'empêchement, merci de nous prévenir dès que possible.</p>
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:rgba(28,48,56,.4);">À demain !</p>
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
