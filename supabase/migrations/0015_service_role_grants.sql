-- Explizite Tabellen-Grants für service_role
-- Ab dem 30.10.2026 vergibt Supabase für neue Tabellen im Schema public keine
-- automatischen Data-API-Grants mehr. Bestehende Tabellen behalten ihre Rechte
-- (in Produktion ist diese Migration ein No-op), aber bei einem Neuaufbau
-- (neues Projekt, Preview-Branch, supabase db reset) wären alle Tabellen für
-- den Admin-Client sonst nicht erreichbar.
-- Nur service_role: die App greift ausschliesslich über supabase-admin.ts zu,
-- anon/authenticated bleiben bei der Deny-all-Konvention ohne Rechte.

grant select, insert, update, delete on
  dv_firmen,
  dv_kontakte,
  dv_artikel,
  dv_standorte,
  dv_geraete,
  dv_pruefberichte,
  dv_relationen,
  dv_portalzugaenge,
  portal_firma_einstellungen,
  export_log,
  login_log
to service_role;
