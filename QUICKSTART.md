# Climb - Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create Supabase Project (2 minutes)

1. **Go to**: https://supabase.com
2. **Sign up/Sign in**
3. **Click**: "New Project"
4. **Fill in**:
   - Name: `climb-app`
   - Database Password: (create & save it!)
   - Region: (closest to you)
5. **Click**: "Create new project"
6. **Wait**: ~2 minutes for project to be ready

### Step 2: Get Your Keys (30 seconds)

In your Supabase dashboard:
1. Click **Settings** (gear icon) → **API**
2. Copy these 3 things:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhb...` (long string)
   - **service_role key**: `eyJhb...` (click "Reveal" first)

### Step 3: Setup Database (1 minute)

In Supabase dashboard:
1. Click **SQL Editor** in sidebar
2. Click **"New query"**
3. Open `supabase/migrations/20240101000000_initial_schema.sql` from this project
4. Copy entire contents → Paste into SQL editor
5. Click **"Run"** (bottom right)
6. **Repeat** for:
   - `20240101000001_seed_templates.sql`

**Note:** RLS (Row Level Security) policies are already included in the initial schema!

### Step 4: Get OpenAI Key (1 minute)

1. **Go to**: https://platform.openai.com/api-keys
2. **Click**: "Create new secret key"
3. **Name it**: "Climb App"
4. **Copy**: The key (starts with `sk-...`)
5. **Save it**: You can't see it again!

### Step 5: Configure Environment (30 seconds)

Open `.env.local` and replace with your actual values:

```env
# FROM SUPABASE (Step 2)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...your-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJhb...your-service-key-here

# FROM OPENAI (Step 4)
LLM_API_KEY=sk-...your-openai-key-here
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1

# LEAVE AS IS
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6: Start the App (30 seconds)

```bash
# Kill any running servers
pkill -9 node

# Start fresh
npm run dev
```

**Open**: http://localhost:3000

---

## ✅ You're Done!

Now you can:
- Click **"Start free"** to create an account
- Complete onboarding
- Add your first role
- Generate tailored application packs!

---

## 🆘 Quick Troubleshooting

**"Supabase URL is required"**
→ Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
→ Restart server: `pkill -9 node && npm run dev`

**"Email not confirmed"**
→ Check your email inbox for verification link
→ Click the link before trying to sign in

**"Invalid API key"**
→ Double-check you copied the full key (no spaces)
→ Make sure it starts with `eyJ...` for Supabase, `sk-...` for OpenAI

**"Table does not exist"**
→ Run both SQL migration files in Supabase SQL Editor
→ Check for errors in the SQL results

---

## 📁 File Locations

- **Environment variables**: `.env.local` (in project root)
- **Database migrations**: `supabase/migrations/*.sql`
- **Setup guide**: `SETUP.md` (detailed version)
- **Auth pages**: `app/(auth)/signup/page.tsx` and `signin/page.tsx`

---

## 💡 Pro Tips

1. **Use a personal email** for testing (not work email)
2. **Keep your OpenAI key secure** - don't commit it to git
3. **Start with free tiers** - both Supabase and OpenAI have generous free tiers
4. **Test with a real job post** - paste from LinkedIn/Indeed for best results

---

Need more help? Read the full `SETUP.md` guide!
