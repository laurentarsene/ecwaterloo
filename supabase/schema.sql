-- ═══════════════════════════════════════════════════════
--  ECW — Schéma Supabase
--  Coller dans : Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════

-- Table des inscriptions étudiantes
CREATE TABLE IF NOT EXISTS inscriptions_etudiantes (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  date_rdv      TEXT        NOT NULL,
  prenom        TEXT        NOT NULL,
  nom           TEXT        NOT NULL,
  genre         TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  telephone     TEXT        NOT NULL,
  universite    TEXT        NOT NULL,
  nb_personnes  INTEGER     NOT NULL DEFAULT 1,
  statut        TEXT        NOT NULL DEFAULT 'confirmé'
                CHECK (statut IN ('confirmé', 'rappel_envoyé', 'présent', 'absent'))
);

-- Sécurité : Row Level Security
ALTER TABLE inscriptions_etudiantes ENABLE ROW LEVEL SECURITY;

-- Règle 1 : n'importe qui peut s'inscrire (formulaire public)
CREATE POLICY "Inscription publique"
  ON inscriptions_etudiantes
  FOR INSERT TO anon
  WITH CHECK (true);

-- Règle 2 : les admins connectés peuvent tout faire
CREATE POLICY "Accès admin complet"
  ON inscriptions_etudiantes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
--  Table des lutins (Opération Lutins & Lutines — Noël)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inscriptions_lutins (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  prenom            TEXT        NOT NULL,
  nom               TEXT        NOT NULL,
  email             TEXT,
  telephone         TEXT,
  nb_lettres        INTEGER     NOT NULL DEFAULT 1 CHECK (nb_lettres >= 1),
  lettre_envoyee    BOOLEAN     NOT NULL DEFAULT FALSE,
  cadeau_confirme   BOOLEAN     NOT NULL DEFAULT FALSE,
  cadeau_recu       BOOLEAN     NOT NULL DEFAULT FALSE,
  cadeau_remis      BOOLEAN     NOT NULL DEFAULT FALSE,
  notes             TEXT        NOT NULL DEFAULT '',
  -- Au moins un moyen de contact
  CHECK (
    (email IS NOT NULL AND length(trim(email)) > 0)
    OR (telephone IS NOT NULL AND length(trim(telephone)) > 0)
  )
);

ALTER TABLE inscriptions_lutins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inscription lutin publique"
  ON inscriptions_lutins
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Accès admin lutins"
  ON inscriptions_lutins
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── CRON : rappels automatiques la veille à 8h ──────────────────────────────
-- Activer l'extension pg_cron si ce n'est pas déjà fait :
-- Dashboard → Database → Extensions → pg_cron → Enable

-- Remplacer YOUR_PROJECT_ID et YOUR_SERVICE_ROLE_KEY ci-dessous
-- (Service Role Key : Project Settings → API → service_role)

/*
SELECT cron.schedule(
  'rappels-etudiants-quotidien',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
*/
-- Décommentez et remplissez les valeurs pour activer le CRON.
