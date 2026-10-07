// ═══════════════════════════════════════════════════════
//  ECW — ancienne fonction d'e-mail, désactivée (octobre 2026)
//  Elle envoyait un e-mail à n'importe quelle adresse fournie par le navigateur.
//  Les e-mails partent désormais de la fonction `ecw-api`, à partir des données en base.
// ═══════════════════════════════════════════════════════
Deno.serve((req) => req.method === 'OPTIONS'
  ? new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  : new Response(JSON.stringify({ erreur: 'remplacee_par_ecw-api' }), { status: 410, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }));
