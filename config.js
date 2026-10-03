// ═══════════════════════════════════════════════════════
//  ECW — Configuration Supabase
//  À remplir après création du projet sur supabase.com
// ═══════════════════════════════════════════════════════

const SUPABASE_URL      = 'https://vzfrrhvifoaaupzqicbs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6ZnJyaHZpZm9hYXVwenFpY2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTI0NzQsImV4cCI6MjA5MDk4ODQ3NH0.HiZ3h941BQGVmIDO2ZGQ7oJh93h9gC9Lm1aaYzDQbxM';

// ═══════════════════════════════════════════════════════
//  Épicerie étudiante — dates exceptionnelles
//  Par défaut : 1er jeudi du mois. Pour déplacer un mois,
//  ajouter 'AAAA-MM': jour (le jour du mois retenu).
//  ⚠ Reporter aussi dans supabase/functions/send-reminders/index.ts
// ═══════════════════════════════════════════════════════

const EPICERIE_DATES_EXCEPTIONNELLES = {
  '2026-10': 8, // octobre 2026 : 2e jeudi (8/10) au lieu du 1er
};
