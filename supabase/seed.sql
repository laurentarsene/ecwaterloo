-- Local uniquement (supabase db reset) : boîte d'envoi de test.
-- Avec MAIL_OUTBOX=1, les fonctions y écrivent les e-mails au lieu de les envoyer.
create table if not exists public.dev_outbox (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  destinataire text, sujet text, html text, pieces jsonb
);
