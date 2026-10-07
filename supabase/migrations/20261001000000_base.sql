-- Schéma existant en production au 7 octobre 2026 (tables étudiants, lutins, réglages).
-- Déjà appliqué en production : ne pas le rejouer là-bas (voir README).




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."inscriptions_etudiantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date_rdv" "text" NOT NULL,
    "prenom" "text" NOT NULL,
    "nom" "text" NOT NULL,
    "genre" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telephone" "text" NOT NULL,
    "universite" "text" NOT NULL,
    "nb_personnes" integer DEFAULT 1 NOT NULL,
    "statut" "text" DEFAULT 'confirmé'::"text" NOT NULL,
    CONSTRAINT "inscriptions_etudiantes_statut_check" CHECK (("statut" = ANY (ARRAY['confirmé'::"text", 'rappel_envoyé'::"text", 'présent'::"text", 'absent'::"text"])))
);


ALTER TABLE "public"."inscriptions_etudiantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inscriptions_lutins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "prenom" "text" NOT NULL,
    "nom" "text" NOT NULL,
    "email" "text",
    "telephone" "text",
    "nb_lettres" integer DEFAULT 1 NOT NULL,
    "lettre_envoyee" boolean DEFAULT false NOT NULL,
    "cadeau_confirme" boolean DEFAULT false NOT NULL,
    "cadeau_recu" boolean DEFAULT false NOT NULL,
    "cadeau_remis" boolean DEFAULT false NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "inscriptions_lutins_check" CHECK (((("email" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "email")) > 0)) OR (("telephone" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "telephone")) > 0)))),
    CONSTRAINT "inscriptions_lutins_nb_lettres_check" CHECK (("nb_lettres" >= 1))
);


ALTER TABLE "public"."inscriptions_lutins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."inscriptions_etudiantes"
    ADD CONSTRAINT "inscriptions_etudiantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inscriptions_lutins"
    ADD CONSTRAINT "inscriptions_lutins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



CREATE POLICY "Accès admin complet" ON "public"."inscriptions_etudiantes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Accès admin lutins" ON "public"."inscriptions_lutins" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Admin modifie" ON "public"."settings" TO "authenticated" USING (true);



CREATE POLICY "Inscription lutin publique" ON "public"."inscriptions_lutins" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Inscription publique" ON "public"."inscriptions_etudiantes" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Lecture publique" ON "public"."settings" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."inscriptions_etudiantes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inscriptions_lutins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."inscriptions_etudiantes" TO "anon";
GRANT ALL ON TABLE "public"."inscriptions_etudiantes" TO "authenticated";
GRANT ALL ON TABLE "public"."inscriptions_etudiantes" TO "service_role";



GRANT ALL ON TABLE "public"."inscriptions_lutins" TO "anon";
GRANT ALL ON TABLE "public"."inscriptions_lutins" TO "authenticated";
GRANT ALL ON TABLE "public"."inscriptions_lutins" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







