-- 0010_rls_enable.sql
-- Activar RLS en las 20 tablas. SIN FORCE (FORCE reabre la recursion, ver 0007).
--
-- PUNTO DE CORTE: despues de aplicar esto y ANTES de 0011, la app esta
-- TOTALMENTE rota: ni el login lee profiles. Eso es correcto: es la unica vez
-- que veras deny-by-default puro. Si algo SIGUE funcionando aqui, tienes una
-- tabla sin RLS -> es el bug mas importante de tu esquema.

alter table public.profiles            enable row level security;
alter table public.tutor_assignments   enable row level security;
alter table public.consent_documents   enable row level security;
alter table public.consents            enable row level security;
alter table public.checkins            enable row level security;
alter table public.checkin_notes       enable row level security;
alter table public.emotional_entries   enable row level security;
alter table public.activity_catalog    enable row level security;
alter table public.activity_sessions   enable row level security;
alter table public.wellness_indicators enable row level security;
alter table public.gamification_state  enable row level security;
alter table public.points_ledger       enable row level security;
alter table public.alert_rules         enable row level security;
alter table public.alerts              enable row level security;
alter table public.followups           enable row level security;
alter table public.report_templates    enable row level security;
alter table public.reports             enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.help_resources      enable row level security;
alter table public.retention_settings  enable row level security;
