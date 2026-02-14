-- Enterprise platform tables: collaboration, governance, security, and analytics

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  entity_id TEXT,
  content TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, session_key)
);

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  format TEXT NOT NULL DEFAULT 'json',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  reason TEXT,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace_created ON public.workspace_activity_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_comments_workspace_created ON public.workspace_comments(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON public.audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_anomalies_user_created ON public.security_anomalies(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_last_seen ON public.user_sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_created ON public.data_export_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_created ON public.data_deletion_requests(user_id, created_at DESC);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own workspaces" ON public.workspaces;
CREATE POLICY "Users can manage own workspaces"
  ON public.workspaces
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own workspace memberships" ON public.workspace_members;
CREATE POLICY "Users can view own workspace memberships"
  ON public.workspace_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace owners can manage workspace memberships" ON public.workspace_members;
CREATE POLICY "Workspace owners can manage workspace memberships"
  ON public.workspace_members
  FOR ALL
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can view activity events" ON public.workspace_activity_events;
CREATE POLICY "Workspace members can view activity events"
  ON public.workspace_activity_events
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace members can create activity events" ON public.workspace_activity_events;
CREATE POLICY "Workspace members can create activity events"
  ON public.workspace_activity_events
  FOR INSERT
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
      OR workspace_id IN (
        SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members can manage comments" ON public.workspace_comments;
CREATE POLICY "Workspace members can manage comments"
  ON public.workspace_comments
  FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
      )
      OR workspace_id IN (
        SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can view own audit events" ON public.audit_events;
CREATE POLICY "Users can view own audit events"
  ON public.audit_events
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own audit events" ON public.audit_events;
CREATE POLICY "Users can insert own audit events"
  ON public.audit_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own security anomalies" ON public.security_anomalies;
CREATE POLICY "Users can view own security anomalies"
  ON public.security_anomalies
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own security anomalies" ON public.security_anomalies;
CREATE POLICY "Users can insert own security anomalies"
  ON public.security_anomalies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions"
  ON public.user_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own export requests" ON public.data_export_requests;
CREATE POLICY "Users can manage own export requests"
  ON public.data_export_requests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own deletion requests" ON public.data_deletion_requests;
CREATE POLICY "Users can manage own deletion requests"
  ON public.data_deletion_requests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin controls are read-only to authenticated users" ON public.admin_controls;
CREATE POLICY "Admin controls are read-only to authenticated users"
  ON public.admin_controls
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
