-- ═══════════════════════════════════════════════════════════════════════
--  ECW v2 — bénévoles, contenus éditables par l'admin, compteurs vivants
--
--  À appliquer UNE fois en production (Supabase → SQL Editor → coller → Run),
--  ou avec `supabase db push` (voir README).
--
--  Principe de sécurité : le public ne lit jamais de données personnelles.
--  Les inscriptions passent par la fonction serveur `ecw-api` (clé service),
--  les compteurs par des fonctions SQL qui ne renvoient que des nombres.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Outils ──────────────────────────────────────────────────────────────
create or replace function public.ecw_aujourdhui() returns date
language sql stable as $$ select (now() at time zone 'Europe/Brussels')::date $$;

create or replace function public.ecw_reglage_int(p_cle text) returns int
language sql stable security definer set search_path = public as $$
  select case when value ~ '^\s*\d+\s*$' then trim(value)::int end from settings where key = p_cle
$$;

-- « Jeudi 8 octobre 2026 » (format historique de date_rdv, gardé tel quel)
create or replace function public.ecw_libelle_date(d date) returns text
language sql immutable as $$
  select (array['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'])[extract(dow from d)::int + 1]
      || ' ' || extract(day from d)::int || ' '
      || (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[extract(month from d)::int]
      || ' ' || extract(year from d)::int
$$;


-- ═══════════════════════════════════════════════════════════════════════
--  1. ÉPICERIE ÉTUDIANTE — dates, capacité, liste d'attente
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists public.epicerie_mois (
  mois        text primary key check (mois ~ '^\d{4}-\d{2}$'),
  jour        date,                                  -- null : 1er jeudi du mois
  annule      boolean not null default false,
  capacite    int check (capacite is null or capacite > 0),  -- null : capacité par défaut (réglages)
  note        text not null default '',
  updated_at  timestamptz not null default now(),
  check (jour is null or to_char(jour, 'YYYY-MM') = mois)
);
alter table public.epicerie_mois enable row level security;
create policy "Lecture publique" on public.epicerie_mois for select to anon, authenticated using (true);
create policy "Admin gère" on public.epicerie_mois for all to authenticated using (true) with check (true);

-- L'exception d'octobre 2026 (auparavant dans config.js)
insert into public.epicerie_mois (mois, jour, note) values ('2026-10', '2026-10-08', 'Exceptionnellement le 2e jeudi')
on conflict (mois) do nothing;

create or replace function public.epicerie_date_mois(p_mois text) returns date
language sql stable security definer set search_path = public as $$
  with m as (select to_date(p_mois || '-01', 'YYYY-MM-DD') as d1)
  select coalesce(
    (select jour from epicerie_mois where mois = p_mois),
    (select d1 + ((4 - extract(dow from d1)::int + 7) % 7) from m)
  )
$$;

alter table public.inscriptions_etudiantes drop constraint if exists inscriptions_etudiantes_statut_check;
alter table public.inscriptions_etudiantes add constraint inscriptions_etudiantes_statut_check
  check (statut in ('confirmé', 'rappel_envoyé', 'présent', 'absent', 'liste_attente', 'annulé'));
alter table public.inscriptions_etudiantes
  add column if not exists date_jour             date,
  add column if not exists token                 uuid not null default gen_random_uuid(),
  add column if not exists depuis_attente        boolean not null default false,
  add column if not exists mail_confirmation_at  timestamptz,
  add column if not exists mail_attente_at       timestamptz,
  add column if not exists annule_at             timestamptz;
create unique index if not exists inscriptions_etudiantes_token_idx on public.inscriptions_etudiantes (token);
-- Les inscriptions existantes ont déjà reçu leur e-mail
update public.inscriptions_etudiantes set mail_confirmation_at = created_at where mail_confirmation_at is null;
-- Les inscriptions passent désormais par la fonction serveur (capacité, liste d'attente, e-mails)
drop policy if exists "Inscription publique" on public.inscriptions_etudiantes;

-- Prochaine épicerie étudiante : date, capacité et places (aucune donnée personnelle)
create or replace function public.epicerie_prochaine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := ecw_aujourdhui();
  v_mois  date := date_trunc('month', v_today)::date;
  v_d date; v_m text; v_cap int; v_pris int; v_attente int; v_jours int; v_annules text[] := '{}';
begin
  for i in 0..12 loop
    v_m := to_char(v_mois + make_interval(months => i), 'YYYY-MM');
    v_d := epicerie_date_mois(v_m);
    if v_d <= v_today then continue; end if;
    if coalesce((select annule from epicerie_mois where mois = v_m), false) then
      v_annules := v_annules || v_m; continue;
    end if;
    v_cap := coalesce((select capacite from epicerie_mois where mois = v_m), ecw_reglage_int('capacite_etudiants'));
    select coalesce(sum(nb_personnes), 0) into v_pris from inscriptions_etudiantes
      where date_rdv = ecw_libelle_date(v_d) and statut in ('confirmé', 'rappel_envoyé', 'présent');
    select count(*) into v_attente from inscriptions_etudiantes
      where date_rdv = ecw_libelle_date(v_d) and statut = 'liste_attente';
    v_jours := coalesce(ecw_reglage_int('jours_inscription_max'), 3);
    return jsonb_build_object(
      'date', v_d, 'libelle', ecw_libelle_date(v_d), 'mois', v_m,
      'ouverture', v_d - v_jours, 'capacite', v_cap, 'inscrits', v_pris,
      'restantes', case when v_cap is null then null else greatest(v_cap - v_pris, 0) end,
      'attente', v_attente, 'mois_annules', to_jsonb(v_annules),
      'note', (select note from epicerie_mois where mois = v_m));
  end loop;
  return null;
end $$;

-- Inscription (appelée par la fonction serveur uniquement)
create or replace function public.inscrire_etudiant(
  p_prenom text, p_nom text, p_genre text, p_email text, p_telephone text, p_universite text, p_nb int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb; v_libelle text; v_statut text; v_row inscriptions_etudiantes;
begin
  v := epicerie_prochaine();
  if v is null then raise exception 'aucune_date'; end if;
  if ecw_aujourdhui() < (v->>'ouverture')::date then raise exception 'pas_ouvert'; end if;
  if p_nb is null or p_nb < 1 or p_nb > 10 then raise exception 'nb_invalide'; end if;
  v_libelle := v->>'libelle';
  perform pg_advisory_xact_lock(hashtext('etudiants:' || v_libelle));
  if exists (select 1 from inscriptions_etudiantes where lower(email) = lower(trim(p_email))
             and date_rdv = v_libelle and statut <> 'annulé') then
    raise exception 'deja_inscrit';
  end if;
  v := epicerie_prochaine();   -- recompté sous verrou
  v_statut := case when (v->>'capacite') is not null and (v->>'inscrits')::int + p_nb > (v->>'capacite')::int
                   then 'liste_attente' else 'confirmé' end;
  insert into inscriptions_etudiantes (date_rdv, date_jour, prenom, nom, genre, email, telephone, universite, nb_personnes, statut)
  values (v_libelle, (v->>'date')::date, trim(p_prenom), trim(p_nom), coalesce(nullif(trim(p_genre), ''), 'Non précisé'),
          lower(trim(p_email)), trim(p_telephone), trim(p_universite), p_nb, v_statut)
  returning * into v_row;
  return jsonb_build_object('id', v_row.id, 'statut', v_row.statut, 'date_rdv', v_row.date_rdv, 'date', v_row.date_jour);
end $$;

-- Annulation par l'étudiant·e : libère la place et fait monter la liste d'attente
create or replace function public.etudiant_annuler(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row inscriptions_etudiantes; v_cap int; v_pris int; v_promus uuid[] := '{}'; r record;
begin
  select * into v_row from inscriptions_etudiantes where token = p_token for update;
  if not found then raise exception 'introuvable'; end if;
  if v_row.statut not in ('confirmé', 'rappel_envoyé', 'liste_attente') then
    return jsonb_build_object('statut', v_row.statut, 'promus', '[]'::jsonb);
  end if;
  perform pg_advisory_xact_lock(hashtext('etudiants:' || v_row.date_rdv));
  update inscriptions_etudiantes set statut = 'annulé', annule_at = now() where id = v_row.id;
  v_cap := coalesce((select capacite from epicerie_mois where mois = to_char(v_row.date_jour, 'YYYY-MM')), ecw_reglage_int('capacite_etudiants'));
  for r in select id, nb_personnes from inscriptions_etudiantes
           where date_rdv = v_row.date_rdv and statut = 'liste_attente' order by created_at loop
    select coalesce(sum(nb_personnes), 0) into v_pris from inscriptions_etudiantes
      where date_rdv = v_row.date_rdv and statut in ('confirmé', 'rappel_envoyé', 'présent');
    exit when v_cap is not null and v_pris + r.nb_personnes > v_cap;
    update inscriptions_etudiantes set statut = 'confirmé', depuis_attente = true, mail_confirmation_at = null where id = r.id;
    v_promus := v_promus || r.id;
  end loop;
  return jsonb_build_object('statut', 'annulé', 'promus', to_jsonb(v_promus));
end $$;


-- ═══════════════════════════════════════════════════════════════════════
--  2. BÉNÉVOLES — catégories, créneaux, inscriptions (sans compte)
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists public.benevole_categories (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  description text not null default '',
  consignes   text not null default '',
  lieu        text not null default 'Épicerie sociale, rue de la Station 139A, 1410 Waterloo',
  couleur     text not null default 'olive' check (couleur in ('coral', 'teal', 'olive', 'navy', 'gold', 'blue')),
  ordre       int not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.benevole_creneaux (
  id            uuid primary key default gen_random_uuid(),
  categorie_id  uuid not null references public.benevole_categories (id) on delete restrict,
  debut         timestamptz not null,
  fin           timestamptz not null,
  places        int not null default 1 check (places between 1 and 200),
  note          text not null default '',
  publie        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (fin > debut)
);
create index if not exists benevole_creneaux_debut_idx on public.benevole_creneaux (debut);

create table if not exists public.benevole_inscriptions (
  id                    uuid primary key default gen_random_uuid(),
  creneau_id            uuid not null references public.benevole_creneaux (id) on delete cascade,
  prenom                text not null,
  nom                   text not null,
  email                 text not null,
  telephone             text not null default '',
  message               text not null default '',
  token                 uuid not null unique default gen_random_uuid(),
  statut                text not null default 'a_confirmer'
                        check (statut in ('a_confirmer', 'confirme', 'valide', 'refuse', 'annule', 'expire')),
  presence              text check (presence in ('oui', 'non')),
  note_admin            text not null default '',
  created_at            timestamptz not null default now(),
  confirme_at           timestamptz,
  valide_at             timestamptz,
  annule_at             timestamptz,
  mail_confirmation_at  timestamptz,
  mail_decision_at      timestamptz,
  mail_rappel_at        timestamptz,
  admin_notifie_at      timestamptz
);
create index if not exists benevole_inscriptions_creneau_idx on public.benevole_inscriptions (creneau_id);

alter table public.benevole_categories   enable row level security;
alter table public.benevole_creneaux     enable row level security;
alter table public.benevole_inscriptions enable row level security;
create policy "Lecture publique" on public.benevole_categories for select to anon using (actif);
create policy "Admin gère"       on public.benevole_categories for all to authenticated using (true) with check (true);
create policy "Admin gère"       on public.benevole_creneaux   for all to authenticated using (true) with check (true);
create policy "Admin gère"       on public.benevole_inscriptions for all to authenticated using (true) with check (true);

-- Une place est prise par une inscription validée, confirmée, ou en attente de confirmation depuis moins de 48 h
create or replace function public.benevole_places_prises(p_creneau uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from benevole_inscriptions
  where creneau_id = p_creneau
    and (statut in ('confirme', 'valide') or (statut = 'a_confirmer' and created_at > now() - interval '48 hours'))
$$;

-- Calendrier public : créneaux à venir et places restantes, sans aucune donnée personnelle
create or replace function public.benevole_creneaux_publics(p_de date default null, p_a date default null)
returns table (id uuid, debut timestamptz, fin timestamptz, places int, restantes int, note text,
               categorie_id uuid, categorie text, description text, consignes text, lieu text, couleur text)
language sql stable security definer set search_path = public as $$
  select c.id, c.debut, c.fin, c.places, greatest(c.places - benevole_places_prises(c.id), 0), c.note,
         k.id, k.nom, k.description, k.consignes, k.lieu, k.couleur
  from benevole_creneaux c join benevole_categories k on k.id = c.categorie_id
  where c.publie and k.actif and c.debut > now()
    and (p_de is null or c.debut >= p_de) and (p_a is null or c.debut < p_a + 1)
  order by c.debut
$$;

-- Inscription (appelée par la fonction serveur uniquement)
create or replace function public.inscrire_benevole(
  p_creneau uuid, p_prenom text, p_nom text, p_email text, p_telephone text, p_message text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c benevole_creneaux; v_row benevole_inscriptions;
begin
  select * into c from benevole_creneaux where id = p_creneau for update;
  if not found or not c.publie or c.debut <= now() then raise exception 'creneau_indisponible'; end if;
  if not exists (select 1 from benevole_categories where id = c.categorie_id and actif) then raise exception 'creneau_indisponible'; end if;
  if exists (select 1 from benevole_inscriptions where creneau_id = p_creneau and lower(email) = lower(trim(p_email))
             and statut in ('a_confirmer', 'confirme', 'valide')) then
    raise exception 'deja_inscrit';
  end if;
  if (select count(*) from benevole_inscriptions where lower(email) = lower(trim(p_email)) and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'trop_de_demandes';
  end if;
  if benevole_places_prises(p_creneau) >= c.places then raise exception 'complet'; end if;
  insert into benevole_inscriptions (creneau_id, prenom, nom, email, telephone, message)
  values (p_creneau, trim(p_prenom), trim(p_nom), lower(trim(p_email)), coalesce(trim(p_telephone), ''), coalesce(trim(p_message), ''))
  returning * into v_row;
  return jsonb_build_object('id', v_row.id);
end $$;

-- Catégories de départ (modifiables dans l'admin)
insert into public.benevole_categories (nom, description, consignes, couleur, ordre)
select * from (values
  ('Distribution des colis', 'Préparer et remettre les colis alimentaires aux familles, le premier mardi du mois.', 'Prévoir des vêtements confortables. Les colis peuvent être lourds.', 'coral', 1),
  ('Épicerie étudiante', 'Accueillir les étudiant·es et tenir la caisse lors de l''épicerie étudiante du jeudi.', 'Arriver 15 minutes avant l''ouverture.', 'teal', 2),
  ('Accueil & épicerie', 'Accueillir les personnes, ranger les rayons, tenir la caisse de l''épicerie sociale.', 'Une première fois en binôme avec un·e bénévole expérimenté·e.', 'olive', 3),
  ('Logistique & transport', 'Aller chercher les dons et les marchandises chez nos partenaires, avec ou sans voiture.', 'Indiquez dans le message si vous venez avec une voiture.', 'navy', 4),
  ('Potager', 'Entretenir le potager collectif : semis, arrosage, récoltes pour l''épicerie.', 'Gants et bottes conseillés.', 'gold', 5),
  ('Événements', 'Donner un coup de main pour la Magie de Noël, la rentrée scolaire, le théâtre et les fêtes.', '', 'blue', 6)
) as v(nom, description, consignes, couleur, ordre)
where not exists (select 1 from public.benevole_categories);


-- ═══════════════════════════════════════════════════════════════════════
--  3. CONTENUS ÉDITABLES — besoins du moment, actus & agenda, gazettes
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists public.besoins (
  id          uuid primary key default gen_random_uuid(),
  libelle     text not null,
  detail      text not null default '',
  urgent      boolean not null default false,
  ordre       int not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.besoins enable row level security;
create policy "Lecture publique" on public.besoins for select to anon using (actif);
create policy "Admin gère"       on public.besoins for all to authenticated using (true) with check (true);

create table if not exists public.actus (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null,
  date_evenement date,                -- null : simple nouvelle
  heure       text not null default '',
  lieu        text not null default '',
  texte       text not null default '',
  lien_url    text not null default '',
  lien_label  text not null default '',
  publie      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.actus enable row level security;
create policy "Lecture publique" on public.actus for select to anon using (publie);
create policy "Admin gère"       on public.actus for all to authenticated using (true) with check (true);

create table if not exists public.gazettes (
  id          uuid primary key default gen_random_uuid(),
  numero      int not null unique check (numero > 0),
  titre       text not null,          -- ex. « Juillet 2026 »
  pdf_url     text not null,
  cover_url   text not null,
  publie      boolean not null default true,
  envoyee_at  timestamptz,            -- envoi aux abonné·es
  envoyee_nb  int,
  created_at  timestamptz not null default now()
);
alter table public.gazettes enable row level security;
create policy "Lecture publique" on public.gazettes for select to anon using (publie);
create policy "Admin gère"       on public.gazettes for all to authenticated using (true) with check (true);
insert into public.gazettes (numero, titre, pdf_url, cover_url, envoyee_at) values
  (1, 'Printemps 2026', '/assets/magazines/gazette-01.pdf', '/assets/magazines/gazette-01-cover.jpg', now()),
  (2, 'Juillet 2026',   '/assets/magazines/gazette-02.pdf', '/assets/magazines/gazette-02-cover.jpg', now())
on conflict (numero) do nothing;

create table if not exists public.abonnes_gazette (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  token       uuid not null unique default gen_random_uuid(),
  statut      text not null default 'a_confirmer' check (statut in ('a_confirmer', 'actif', 'desabonne')),
  created_at  timestamptz not null default now(),
  confirme_at timestamptz,
  mail_confirmation_at timestamptz
);
alter table public.abonnes_gazette enable row level security;
create policy "Admin gère" on public.abonnes_gazette for all to authenticated using (true) with check (true);

-- Fichiers des gazettes (PDF + couverture), envoyés depuis l'admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gazettes', 'gazettes', true, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "Gazettes : lecture publique" on storage.objects for select to anon, authenticated using (bucket_id = 'gazettes');
create policy "Gazettes : admin ajoute"     on storage.objects for insert to authenticated with check (bucket_id = 'gazettes');
create policy "Gazettes : admin modifie"    on storage.objects for update to authenticated using (bucket_id = 'gazettes');
create policy "Gazettes : admin supprime"   on storage.objects for delete to authenticated using (bucket_id = 'gazettes');


-- ═══════════════════════════════════════════════════════════════════════
--  4. COMPTEURS PUBLICS ET RÉGLAGES
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.lutins_progression() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'lettres', (select coalesce(sum(nb_lettres), 0) from inscriptions_lutins
                where created_at >= make_date(extract(year from ecw_aujourdhui())::int, 1, 1)),
    'objectif', ecw_reglage_int('objectif_lutins'))
$$;

insert into public.settings (key, value) values
  ('email_admin', 'infos.ecwaterloo@gmail.com'),
  ('chiffres_impact', '[{"valeur":"2014","libelle":"ouverture de l''épicerie sociale de Waterloo"},{"valeur":"100 %","libelle":"bénévole : personne n''est payé"},{"valeur":"179","libelle":"repas de Noël distribués en décembre 2025"},{"valeur":"8e","libelle":"Opération rentrée scolaire, en août 2025"}]')
on conflict (key) do nothing;

-- Droits : les fonctions de lecture sont publiques, les inscriptions réservées au serveur
revoke execute on function public.inscrire_etudiant(text, text, text, text, text, text, int) from public, anon, authenticated;
revoke execute on function public.etudiant_annuler(uuid) from public, anon, authenticated;
revoke execute on function public.inscrire_benevole(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.inscrire_etudiant(text, text, text, text, text, text, int) to service_role;
grant execute on function public.etudiant_annuler(uuid) to service_role;
grant execute on function public.inscrire_benevole(uuid, text, text, text, text, text) to service_role;
grant execute on function public.epicerie_prochaine() to anon, authenticated;
grant execute on function public.benevole_creneaux_publics(date, date) to anon, authenticated;
grant execute on function public.lutins_progression() to anon, authenticated;
