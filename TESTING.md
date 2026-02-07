# Climb Testing Guide

This guide walks you through testing the complete Climb application after setup.

## Prerequisites

- Application running at `http://localhost:3000`
- Supabase project configured
- OpenAI API key configured
- All environment variables set

## Test Flow

### 1. Landing & Marketing Pages

**Test Landing Page**
1. Navigate to `http://localhost:3000`
2. Should redirect to `/landing`
3. Verify:
   - Premium hero section with "Land better roles, faster"
   - Three feature cards (Build Profile, Paste Job, Get Pack)
   - CTA buttons work
   - Footer links are present

**Test Other Marketing Pages**
- `/pricing` - Free vs Pro comparison
- `/how-it-works` - 6-step guide
- `/trust` - Security info
- `/templates` - Template showcase
- `/legal/privacy` - Privacy policy
- `/legal/terms` - Terms of service

### 2. Authentication Flow

**Sign Up**
1. Click "Start free" or go to `/signup`
2. Enter:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
3. Submit form
4. Should redirect to `/onboarding`
5. Verify profile was created in Supabase `profiles` table

**Sign Out & Sign In**
1. Sign out from user menu
2. Go to `/signin`
3. Enter same credentials
4. Should redirect to `/app/dashboard`

### 3. Onboarding Flow

**Complete Onboarding (4 Steps)**

**Step 1: Goals**
- Target roles: "Software Engineer, Product Manager"
- Target industries: "Tech, SaaS"
- Click Continue

**Step 2: Profile**
- Headline: "Senior Software Engineer | Full-stack Developer"
- Location: "San Francisco, CA"
- Skills: "React, TypeScript, Node.js, Python, AWS"
- Click Continue

**Step 3: Resume**
- Paste sample resume text or skip
- Click Continue

**Step 4: Preferences**
- Select tone: "Professional"
- Click Complete setup
- Should redirect to `/app/dashboard`

**Verify Database**
- Check Supabase `profiles` table has updated data
- Check `skills` table has 5 entries

### 4. Dashboard

**Verify Dashboard Elements**
1. See "Welcome back, Test User"
2. Three stat cards:
   - Today's Focus (0 actions due)
   - Active Pipeline (0 applications)
   - Profile Strength (should show percentage)
3. Empty state for "Recent Roles"
4. "Add your first role" CTA

### 5. Create a Role

**Navigate to New Role**
1. Click "Add your first role" or top bar "Create" button
2. Should be at `/app/roles/new`

**Paste Sample Job Description**

Use this test job:
```
Senior Software Engineer - Acme Corp

Location: San Francisco, CA

About the Role:
We're seeking a Senior Software Engineer to join our growing team. You'll build scalable web applications and lead technical initiatives.

Responsibilities:
- Design and implement full-stack features
- Mentor junior developers
- Collaborate with product and design teams
- Review code and ensure quality
- Deploy and monitor production systems

Requirements:
- 5+ years of software engineering experience
- Strong proficiency in React and Node.js
- Experience with TypeScript
- Knowledge of AWS or similar cloud platforms
- Excellent communication skills

Nice to Have:
- Experience with GraphQL
- Knowledge of Kubernetes
- Previous leadership experience
- Open source contributions
```

**Test Parsing**
1. Paste job text into textarea
2. Fill in:
   - Company: "Acme Corp"
   - Title: "Senior Software Engineer"
   - Location: "San Francisco, CA"
3. Click "Parse Job"
4. Wait for parsing (should take 3-10 seconds)
5. Verify right panel shows:
   - Must-haves (React, Node.js, TypeScript, AWS, etc.)
   - Nice-to-haves (GraphQL, Kubernetes, etc.)
   - Keywords extracted
   - Responsibilities listed
6. Click "Save Role"
7. Should redirect to `/app/roles/{id}`

**Verify Database**
- Check `roles` table has new entry with parsed JSON
- Check `applications` table has draft application

### 6. Role Workspace (The Wow Screen)

**Verify Layout**
1. Three-column layout:
   - Left: Role intelligence (320px)
   - Center: Main content
   - Right: Agent Dock (360px)

**Left Panel: Role Intelligence**
- Company/Title/Location displayed
- Match score (may be 0 initially)
- Must-haves as red badges
- Keywords as outline badges
- Quick notes textarea

**Center: Timeline**
- 5-step visual pipeline
- Current step highlighted (Draft)
- Steps: Draft → Tailor → Export → Apply → Follow-up

**Center: Tabs**
- Overview: Shows requirements and responsibilities
- Pack: Generate pack CTA
- Resume: Empty until pack generated
- Cover Letter: Empty until pack generated
- Follow-ups: Empty until pack generated
- Tracker: Shows draft status

**Right: Agent Dock**
- "Agent Dock" heading with sparkle icon
- Quick action buttons (disabled until pack generated)
- Placeholder for chat

### 7. Generate Application Pack

**Click "Generate Pack"**
1. Go to "Pack" tab
2. Click "Generate Pack" button
3. Wait 10-30 seconds (this calls multiple AI endpoints)
4. Toast notification: "Application pack generated!"
5. Page reloads

**Verify Generated Content**

**Resume Tab:**
- Should show message about resume editor
- Export PDF and Export DOCX buttons visible

**Cover Letter Tab:**
- Textarea with generated cover letter
- Should be 3-4 paragraphs
- Mentions company and role
- Copy to clipboard button

**Follow-ups Tab:**
- Should show follow-up templates message

**Verify Database**
- Check `documents` table has 2 new entries:
  - Type: resume, source: tailored, role_id: current role
  - Type: cover_letter, source: tailored, role_id: current role
- Check `applications` table has updated match_score

**Verify Match Score**
- Left panel should now show match score (e.g., 75%)
- Progress bar should reflect score
- Color-coded: green (80+), yellow (60-79), gray (<60)

### 8. Documents Page

**Navigate to Documents**
1. Click "Documents" in left rail
2. Should see `/app/documents`
3. Verify sections:
   - Master Documents (may be empty or have master resume from onboarding)
   - Tailored Documents (should show the resume and cover letter just created)
4. Each document card shows:
   - Title
   - "Tailored to Acme Corp - Senior Software Engineer"
   - Date created
   - Edit and Export buttons

### 9. Templates Page

**Navigate to Templates**
1. Click "Templates" in left rail
2. Verify three sections with seeded templates:
   - **Follow-up Email Templates**: 3 templates (After Application, Thank You, Post-Interview)
   - **Bullet Style Formulas**: 4 templates (XYZ, STAR, CAR, Impact-First)
   - **Writing Tone Presets**: 4 templates (Professional, Warm, Confident, Technical)
3. Each template card shows name, description, and example/guidelines

### 10. Insights Page

**Navigate to Insights**
1. Click "Insights" in left rail
2. Verify metrics:
   - Average Match: Shows percentage
   - Roles This Week: Shows count
   - Follow-ups Due: Shows count
   - Interviews: Shows count
3. Application Funnel shows:
   - Total Applications
   - Applied
   - Interviews
   - Offers
   - Progress bars
4. Common Keyword Gaps section (placeholder data)

### 11. Settings Pages

**Profile Settings**
1. Navigate to `/app/settings/profile`
2. Should show form pre-filled with onboarding data
3. Edit fields and click "Save Changes"
4. Toast notification: "Profile updated"
5. Verify database updated

**Preferences Settings**
1. Navigate to `/app/settings/preferences`
2. Should show 4 tone options with current selection
3. Select different tone
4. Click "Save Changes"
5. Toast notification: "Preferences updated"

**Billing Settings**
1. Navigate to `/app/settings/billing`
2. Should show current plan (Free)
3. Shows Free vs Pro comparison
4. "Upgrade to Pro" button (not functional yet, placeholder)

**Privacy Settings**
1. Navigate to `/app/settings/privacy`
2. Shows data management options
3. "Export all my data" and "Delete my account" buttons
4. Link to Privacy Policy

### 12. Additional Role Tests

**Create Second Role**
1. Click Create → New Role
2. Add a different role (e.g., "Product Manager at StartupXYZ")
3. Parse and save
4. Verify roles list shows both roles

**Roles List**
1. Navigate to `/app/roles`
2. Should show grid of role cards
3. Each card shows:
   - Title, company, location
   - Match score badge
   - Status badge
   - Date added
4. Click a role card → navigates to workspace

**Dashboard with Data**
1. Return to `/app/dashboard`
2. Should now show:
   - Recent roles section with your roles
   - Updated stats

### 13. Theme Toggle

**Test Dark/Light Mode**
1. Click user avatar → "Toggle theme"
2. Page switches between light and dark mode
3. All colors should adapt (check cards, text, borders)
4. Test across multiple pages

### 14. Navigation

**Left Rail Collapse**
1. Click collapse button (chevron icon)
2. Left rail shrinks to 80px (icons only)
3. Click again to expand
4. Navigation still works in collapsed mode

**Top Bar**
1. Search button (Cmd+K) - opens search dialog (placeholder)
2. Create button - opens creation menu
3. Notifications - shows notification indicator
4. User menu - has Profile, Toggle theme, Sign out options

### 15. Error Cases

**Test Auth Protection**
1. Sign out
2. Try to access `/app/dashboard` directly
3. Should redirect to `/signin`

**Test 404**
1. Navigate to `/app/roles/invalid-uuid`
2. Should show 404 page

**Test Invalid Role ID**
1. Try accessing another user's role (if you have UUID)
2. Should return 404 (RLS blocks it)

## Performance Checks

**Page Load Times**
- Landing: < 1s
- Dashboard: < 2s
- Role Workspace: < 2s
- AI Generation: 10-30s (acceptable for LLM calls)

**Interactivity**
- Buttons should respond instantly
- Form validation immediate
- Smooth transitions (no jank)
- Skeleton loaders during data fetch

## Accessibility Checks

**Keyboard Navigation**
1. Use Tab to navigate through elements
2. All interactive elements should be reachable
3. Focus indicators visible
4. Enter/Space activates buttons

**Screen Reader**
1. Enable VoiceOver (Mac) or NVDA (Windows)
2. Navigate the app
3. All interactive elements should be announced
4. ARIA labels should be present

## Browser Testing

Test in:
- Chrome (primary)
- Firefox
- Safari
- Edge

## Mobile Testing

1. Open in mobile browser or DevTools mobile view
2. Verify responsive layouts
3. Touch targets adequate size
4. No horizontal scroll
5. Navigation works on mobile

## Database Verification

After testing, verify in Supabase:

**Tables should have data:**
- `profiles`: 1 row (your user)
- `skills`: 5 rows (from onboarding)
- `roles`: 1-2 rows (roles you created)
- `applications`: 1-2 rows (one per role)
- `documents`: 2+ rows (tailored resume and cover letter)
- `template_library`: 11 rows (global templates from seed)
- `billing`: 1 row (your billing record)

**RLS Check:**
1. Use Supabase SQL editor
2. Run: `SELECT * FROM roles;` (should return only your roles)
3. Try accessing with different user_id in WHERE clause (should return empty)

## Common Issues

**"Unauthorized" errors**
- Check `.env.local` has correct Supabase keys
- Verify you're signed in
- Check network tab for auth token

**AI endpoints failing**
- Verify LLM_API_KEY is correct
- Check OpenAI/API provider status
- Review rate limits
- Check server logs for error details

**Blank pages**
- Check browser console for errors
- Verify all dependencies installed
- Check Next.js server logs

**Styling issues**
- Clear `.next` folder and rebuild
- Check Tailwind config
- Verify CSS imported in layout

## Success Criteria

✅ Can sign up and sign in
✅ Can complete onboarding
✅ Can create a role and parse job description
✅ Can generate application pack
✅ Match score calculated and displayed
✅ Resume and cover letter created
✅ Can export documents (PDF/DOCX)
✅ All pages load without errors
✅ RLS prevents cross-user access
✅ Theme toggle works
✅ Navigation works smoothly
✅ No console errors

## Reporting Issues

If you encounter issues:
1. Check browser console for errors
2. Check Next.js server terminal for logs
3. Verify environment variables
4. Check Supabase logs
5. Review network tab in DevTools
6. Document steps to reproduce

---

Happy testing! 🚀
