# Climb — Land better roles, faster

A production-ready AI-powered job application assistant built with Next.js, Supabase, and OpenAI-compatible APIs.

## Features

- **Role Parsing**: AI-powered job description analysis extracting requirements, keywords, and must-haves
- **Smart Matching**: Match score calculation with gap analysis
- **Application Pack Generation**: Tailored resumes, cover letters, and follow-up templates
- **Climb Timeline**: Visual pipeline tracking from draft to offer
- **Agent Dock**: AI assistance for improving bullets, regenerating content, and suggestions
- **ATS-Safe Exports**: PDF and DOCX export with clean, parseable formatting
- **Document Versioning**: Track master and tailored resume versions
- **Template Library**: Pre-built follow-up emails, bullet formulas, and tone presets
- **Insights Dashboard**: Track match scores, application funnel, and keyword gaps
- **Row-Level Security**: Strict data isolation per user
- **Enterprise Workspaces**: Multi-workspace collaboration primitives, membership roles, comments, and activity feeds
- **Security Center**: Session/device visibility, anomaly feed, data export/delete workflows
- **Telemetry + Audit Trail**: Page/AI/performance events and governance-ready audit logs
- **Realtime Ops Signals**: Live app-state stream indicators on Control Tower, Forecast, and Horizons
- **CI Quality Gates**: Playwright E2E checks plus performance-budget enforcement
- **Enterprise Lab (30 Features)**: Full feature-portfolio orchestration with rollout states, 7-day AI sprints, and roadmap generation

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** + **shadcn/ui** for premium UI components
- **Framer Motion** for subtle animations
- **TanStack Query** for data fetching/caching
- **React Hook Form** + **Zod** for forms and validation

### Backend
- **Next.js API Routes** for server-side logic
- **Supabase** (Postgres + Auth + RLS)
- **OpenAI-compatible API** for AI generation

### Exports
- **@react-pdf/renderer** for PDF generation
- **docx** npm package for DOCX generation

## Setup

### Prerequisites

- Node.js 20+ and npm 10+
- Supabase account
- OpenAI API key (or compatible provider)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM (OpenAI-compatible API)
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1

# Optional: Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. **Set up Supabase database:**

Run migrations in your Supabase SQL editor:

```bash
# Execute the files in order:
supabase/migrations/20240101000000_initial_schema.sql
supabase/migrations/20240101000001_seed_templates.sql
supabase/migrations/20240101000005_enterprise_feature_suite.sql
```

Or if using Supabase CLI:

```bash
supabase db push
```

4. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional environment variables (enterprise controls)

```env
ADMIN_EMAILS=admin1@example.com,admin2@example.com
E2E_USER_EMAIL=qa-user@example.com
E2E_USER_PASSWORD=super-secret-password
MAX_LARGEST_CHUNK_KB=320
MAX_TOTAL_CHUNKS_KB=2600
```

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── signin/
│   │   └── signup/
│   ├── (marketing)/         # Public marketing pages
│   │   ├── landing/
│   │   ├── pricing/
│   │   ├── how-it-works/
│   │   ├── trust/
│   │   ├── templates/
│   │   └── legal/
│   ├── onboarding/          # User onboarding flow
│   ├── app/                 # Protected application routes
│   │   ├── dashboard/
│   │   ├── roles/
│   │   │   ├── new/
│   │   │   └── [id]/       # Role workspace
│   │   ├── documents/
│   │   ├── templates/
│   │   ├── insights/
│   │   └── settings/
│   └── api/
│       ├── agent/           # AI agent endpoints
│       │   ├── parse-role/
│       │   ├── match-gap/
│       │   ├── generate-pack/
│       │   └── improve-bullet/
│       └── export/          # Export endpoints
│           └── docx/
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── app/                 # Application-specific components
│       ├── app-shell.tsx
│       └── role-workspace.tsx
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── types.ts             # Zod schemas and types
│   ├── utils.ts             # Utility functions
│   ├── llm.ts               # LLM client wrapper
│   ├── prompts.ts           # Versioned AI prompts
│   └── export/              # Export utilities
│       ├── pdf.tsx
│       └── docx.ts
└── supabase/
    └── migrations/          # Database migrations
```

## Key Features Explained

### 1. Role Parsing

Paste a job description, and Climb extracts:
- Title, company, location
- Responsibilities and requirements
- Must-have vs. nice-to-have qualifications
- Keywords and skills

### 2. Match & Gap Analysis

Compares your profile against role requirements:
- Calculates match score (0-100)
- Identifies missing keywords
- Suggests specific improvements
- Recommends new resume bullets

### 3. Generate Application Pack

One-click generation of:
- **Tailored Resume**: Restructured from your master resume to emphasize relevant experience
- **Cover Letter**: Personalized narrative connecting your background to the role
- **Follow-up Templates**: Email templates for after applying, thank you notes, and post-interview check-ins

### 4. Role Workspace (The WOW Screen)

Three-column layout:
- **Left**: Role intelligence (match score, must-haves, keywords)
- **Center**: Tabbed interface (Overview, Pack, Resume, Cover Letter, Follow-ups, Tracker)
- **Right**: Agent Dock (AI assistance with streaming responses)

### 5. ATS-Safe Exports

Export tailored resumes as:
- **PDF**: Clean, parseable format using @react-pdf/renderer
- **DOCX**: Standard Word format using docx library

Both formats avoid tables, icons, and complex formatting that breaks ATS parsing.

## AI Agent Architecture

### Prompt Strategy

All prompts are versioned in `lib/prompts.ts`:
- System prompts enforce safety (no fabrication)
- Output schemas defined with Zod
- Retry logic with fallbacks

### Safety Rules

- Never fabricate experience or achievements
- Only use information from user's profile
- Flag missing metrics with placeholders like [ADD DETAIL]
- Validate all structured outputs with Zod schemas

### Endpoints

- `POST /api/agent/parse-role`: Extract structured data from job text
- `POST /api/agent/match-gap`: Calculate match score and gaps
- `POST /api/agent/generate-pack`: Orchestrate full pack generation
- `POST /api/agent/improve-bullet`: Enhance individual resume bullets

## Database Schema

### Core Tables

- `profiles`: User profile and preferences
- `experiences`: Work experience entries
- `projects`: Portfolio projects
- `skills`: User skills
- `roles`: Job postings
- `applications`: Application tracking (status, match score, next action)
- `documents`: Resume and cover letter versions
- `template_library`: Reusable templates
- `billing`: Subscription info

### Row-Level Security (RLS)

All tables include `user_id` and RLS policies ensuring users can only access their own data.

## Billing & Plans

### Free Plan
- 3 roles/month
- 1 tailored resume version per role
- Basic templates
- PDF export

### Pro Plan ($9/month)
- Unlimited roles
- Unlimited tailored versions
- Version history
- DOCX export
- Premium templates
- Insights dashboard

Usage tracking and plan gating implemented on server side.

## Development

### Code Quality

- TypeScript strict mode
- ESLint for linting
- Zod for runtime validation
- Consistent spacing/typography scale

### Accessibility

- Keyboard navigation
- ARIA labels on interactive elements
- Good contrast ratios
- Focus management

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables

Ensure all required env vars are set in your deployment platform:
- Supabase credentials
- LLM API key and model
- Optional: Stripe keys

## Contributing

This is a production-ready template. To extend:

1. Add new AI workflows in `lib/prompts.ts`
2. Create new API routes in `app/api/`
3. Build new UI components in `components/`
4. Add migrations in `supabase/migrations/`

## License

MIT

## Support

For issues or questions, open a GitHub issue or contact support.

---

**Climb** — Built with Next.js, Supabase, and AI. Land better roles, faster.
