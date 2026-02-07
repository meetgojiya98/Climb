# Climb Setup Guide

## Quick Start

Follow these steps to get Climb running with full functionality:

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- An OpenAI API key (for AI features)

### 2. Supabase Setup

#### Step 2.1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up/sign in
3. Click "New Project"
4. Fill in:
   - **Name**: `climb-app` (or your choice)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
   - **Plan**: Free tier is fine for development
5. Click "Create new project" and wait ~2 minutes

#### Step 2.2: Get Your API Keys

1. In your Supabase project dashboard, click the **Settings** icon (gear) in the sidebar
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this (long string starting with `eyJ...`)
   - **service_role key**: Copy this (click "Reveal" first, then copy)

#### Step 2.3: Run Database Migrations

1. In Supabase dashboard, click **SQL Editor** in sidebar
2. Click "New Query"
3. Copy the contents of `supabase/migrations/20240101000000_initial_schema.sql` from this project
4. Paste into the SQL editor
5. Click "Run" at bottom right
6. Repeat for `20240101000001_seed_templates.sql`

**Note:** RLS policies are already included in the initial schema file!

Alternatively, if you have Supabase CLI installed:
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 3. OpenAI API Key

1. Go to [https://platform.openai.com](https://platform.openai.com)
2. Sign up or sign in
3. Click your profile icon → "View API keys"
4. Click "Create new secret key"
5. Give it a name like "Climb App"
6. Copy the key (starts with `sk-...`)
7. **Important**: Save it now - you can't see it again!

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# OpenAI API
LLM_API_KEY=sk-...your-openai-key...
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Install Dependencies & Run

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The app will start on **http://localhost:3000**

### 6. Create Your First Account

1. Open http://localhost:3000
2. Click "Start Free" or "Sign up"
3. Enter your details
4. Check your email for verification link
5. Click the link to verify
6. You'll be redirected to onboarding!

## Troubleshooting

### "Invalid API key" error when signing up

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Make sure there are no extra spaces or quotes
- Restart the dev server after changing `.env.local`

### "Database error" or "relation does not exist"

- Make sure you ran all three SQL migration files in Supabase
- Check the SQL Editor for any errors
- Tables should be: profiles, experiences, roles, applications, documents, etc.

### AI features not working

- Verify `LLM_API_KEY` is valid
- Check you have credits in your OpenAI account
- Check the API key has correct permissions

### Port already in use

```bash
# Kill any existing Node processes
pkill -9 node

# Or specify a different port
PORT=3001 npm run dev
```

## What You Get

Once configured, you'll have access to:

✅ **Authentication** - Sign up, sign in, email verification  
✅ **Profile Management** - Build your master resume  
✅ **AI Role Parser** - Paste job descriptions, get structured analysis  
✅ **Smart Matching** - See your fit score vs. requirements  
✅ **Resume Tailoring** - Auto-customize your resume per role  
✅ **Cover Letter Generation** - AI-powered, personalized letters  
✅ **Follow-up Templates** - Smart email sequences  
✅ **PDF/DOCX Export** - ATS-friendly document exports  
✅ **Application Tracking** - Pipeline management with reminders  
✅ **Role Workspace** - Premium 3-column interface with Agent Dock  

## Next Steps

1. Complete the onboarding flow
2. Add your first role (paste a job description)
3. Generate your application pack
4. Export and apply!

## Optional: Stripe Setup (for billing)

If you want to enable the billing features:

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard
3. Add them to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

## Need Help?

- Check `IMPLEMENTATION.md` for technical details
- Review `TESTING.md` for testing the features
- See the database schema in `supabase/migrations/`

Happy climbing! 🧗
