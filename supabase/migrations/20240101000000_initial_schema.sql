-- Create enums
CREATE TYPE application_status AS ENUM ('draft', 'applied', 'followup', 'interview', 'offer', 'rejected');
CREATE TYPE document_type AS ENUM ('resume', 'cover_letter');
CREATE TYPE document_source AS ENUM ('master', 'tailored');
CREATE TYPE tone_preset AS ENUM ('professional', 'warm', 'confident', 'technical');
CREATE TYPE template_type AS ENUM ('followup', 'bullet_style', 'tone');
CREATE TYPE billing_plan AS ENUM ('free', 'pro');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'tool');

-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  headline TEXT,
  location TEXT,
  email TEXT,
  target_roles TEXT[] DEFAULT '{}',
  tone_default tone_preset DEFAULT 'professional',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiences table
CREATE TABLE experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  highlights JSONB DEFAULT '[]',
  skills TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  highlights JSONB DEFAULT '[]',
  links JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills table
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  job_text TEXT NOT NULL,
  parsed JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  status application_status DEFAULT 'draft',
  next_action_at TIMESTAMPTZ,
  notes TEXT,
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  source document_source NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template library table
CREATE TABLE template_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type template_type NOT NULL,
  name TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing table
CREATE TABLE billing (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan billing_plan DEFAULT 'free',
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_experiences_user_id ON experiences(user_id);
CREATE INDEX idx_experiences_order ON experiences(user_id, order_index);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_roles_user_id ON roles(user_id);
CREATE INDEX idx_roles_created_at ON roles(user_id, created_at DESC);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_role_id ON applications(role_id);
CREATE INDEX idx_applications_status ON applications(user_id, status);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_role_id ON documents(role_id);
CREATE INDEX idx_documents_type ON documents(user_id, type);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_role_id ON messages(role_id);
CREATE INDEX idx_template_library_user_id ON template_library(user_id);
CREATE INDEX idx_template_library_type ON template_library(type);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for experiences
CREATE POLICY "Users can view own experiences"
  ON experiences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own experiences"
  ON experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiences"
  ON experiences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences"
  ON experiences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for skills
CREATE POLICY "Users can view own skills"
  ON skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
  ON skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON skills FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for roles
CREATE POLICY "Users can view own roles"
  ON roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roles"
  ON roles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own roles"
  ON roles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for applications
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for template_library
CREATE POLICY "Users can view global and own templates"
  ON template_library FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON template_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON template_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON template_library FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for billing
CREATE POLICY "Users can view own billing"
  ON billing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billing"
  ON billing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own billing"
  ON billing FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  INSERT INTO public.billing (user_id, plan)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
