-- Une même personne peut choisir plusieurs créneaux en une fois : ses inscriptions partagent un « lot »
-- (un seul e-mail de confirmation, une seule alerte pour l'équipe, une validation groupée).
alter table public.benevole_inscriptions add column if not exists lot uuid;
create index if not exists benevole_inscriptions_lot_idx on public.benevole_inscriptions (lot);
