-- Enterprise feature suite persistence tables

CREATE TABLE IF NOT EXISTS public.enterprise_feature_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('backlog', 'planned', 'in_progress', 'live')),
  priority INTEGER NOT NULL DEFAULT 85 CHECK (priority >= 0 AND priority <= 100),
  owner TEXT NOT NULL DEFAULT 'AI Program Owner',
  notes TEXT NOT NULL DEFAULT '',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.enterprise_feature_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id TEXT,
  run_kind TEXT NOT NULL CHECK (run_kind IN ('sprint', 'roadmap', 'activation', 'analysis')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_feature_rollouts_user_feature
  ON public.enterprise_feature_rollouts(user_id, feature_id);

CREATE INDEX IF NOT EXISTS idx_enterprise_feature_rollouts_user_status
  ON public.enterprise_feature_rollouts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_enterprise_feature_runs_user_created
  ON public.enterprise_feature_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_feature_runs_user_feature
  ON public.enterprise_feature_runs(user_id, feature_id, created_at DESC);

ALTER TABLE public.enterprise_feature_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_feature_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own enterprise feature rollouts" ON public.enterprise_feature_rollouts;
CREATE POLICY "Users can manage own enterprise feature rollouts"
  ON public.enterprise_feature_rollouts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own enterprise feature runs" ON public.enterprise_feature_runs;
CREATE POLICY "Users can manage own enterprise feature runs"
  ON public.enterprise_feature_runs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
