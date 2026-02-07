-- Advanced tables for Climb (run in Supabase SQL Editor if needed)

-- Cover letters (linked to application or standalone)
CREATE TABLE IF NOT EXISTS public.cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Cover Letter',
  company TEXT,
  position TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON public.cover_letters(user_id);
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cover letters" ON public.cover_letters FOR ALL USING (auth.uid() = user_id);

-- Saved jobs (to apply later)
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  location TEXT,
  salary_range TEXT,
  job_url TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved jobs" ON public.saved_jobs FOR ALL USING (auth.uid() = user_id);

-- Interview practice sessions (for history and scoring)
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  score INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON public.interview_sessions(user_id);
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own interview sessions" ON public.interview_sessions FOR ALL USING (auth.uid() = user_id);

-- Application follow-up date (add column if applications exists)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS activity_notes JSONB DEFAULT '[]';

-- Goal milestones (JSON array on career_goals)
ALTER TABLE public.career_goals ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]';
ALTER TABLE public.career_goals ADD COLUMN IF NOT EXISTS progress_notes TEXT;
