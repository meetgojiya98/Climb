import { z } from 'zod'

// Enums
export const ApplicationStatus = z.enum([
  'draft',
  'applied',
  'followup',
  'interview',
  'offer',
  'rejected',
])

export const DocumentType = z.enum(['resume', 'cover_letter'])

export const DocumentSource = z.enum(['master', 'tailored'])

export const TonePreset = z.enum(['professional', 'warm', 'confident', 'technical'])

export const FollowUpStage = z.enum(['after_apply', 'thank_you', 'post_interview'])

export const TemplateType = z.enum(['followup', 'bullet_style', 'tone'])

export const BillingPlan = z.enum(['free', 'pro'])

// Database types
export type ApplicationStatus = z.infer<typeof ApplicationStatus>
export type DocumentType = z.infer<typeof DocumentType>
export type DocumentSource = z.infer<typeof DocumentSource>
export type TonePreset = z.infer<typeof TonePreset>
export type FollowUpStage = z.infer<typeof FollowUpStage>
export type TemplateType = z.infer<typeof TemplateType>
export type BillingPlan = z.infer<typeof BillingPlan>

// Profile Schema
export const ProfileSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string(),
  headline: z.string().optional(),
  location: z.string().optional(),
  email: z.string().email().optional(),
  target_roles: z.array(z.string()).default([]),
  tone_default: TonePreset.default('professional'),
  updated_at: z.string(),
})

export type Profile = z.infer<typeof ProfileSchema>

// Experience Schema
export const ExperienceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company: z.string(),
  title: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  highlights: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  order_index: z.number(),
})

export type Experience = z.infer<typeof ExperienceSchema>

// Project Schema
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  tech_stack: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  links: z.record(z.string()).optional(),
})

export type Project = z.infer<typeof ProjectSchema>

// Skill Schema
export const SkillSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  level: z.string().optional(),
})

export type Skill = z.infer<typeof SkillSchema>

// Role Parsed Data
export const RoleParsedSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  mustHaves: z.array(z.string()).default([]),
  niceToHaves: z.array(z.string()).default([]),
})

export type RoleParsed = z.infer<typeof RoleParsedSchema>

// Role Schema
export const RoleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  job_text: z.string(),
  parsed: RoleParsedSchema.optional(),
  created_at: z.string(),
})

export type Role = z.infer<typeof RoleSchema>

// Application Schema
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  status: ApplicationStatus,
  next_action_at: z.string().optional().nullable(),
  notes: z.string().optional(),
  match_score: z.number().min(0).max(100).optional(),
  created_at: z.string(),
})

export type Application = z.infer<typeof ApplicationSchema>

// Resume Structure
export const ResumeHeaderSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(z.string()).optional(),
})

export const ResumeSkillCategorySchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
})

export const ResumeExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  bullets: z.array(z.string()),
})

export const ResumeProjectSchema = z.object({
  name: z.string(),
  techStack: z.array(z.string()).optional(),
  bullets: z.array(z.string()),
})

export const ResumeEducationSchema = z.object({
  school: z.string(),
  credential: z.string(),
  dates: z.string().optional(),
})

export const ResumeContentSchema = z.object({
  header: ResumeHeaderSchema,
  headline: z.string().optional(),
  summary: z.string(),
  skills: z.array(ResumeSkillCategorySchema),
  experience: z.array(ResumeExperienceSchema),
  projects: z.array(ResumeProjectSchema).optional(),
  education: z.array(ResumeEducationSchema).optional(),
  certifications: z.array(z.string()).optional(),
})

export type ResumeContent = z.infer<typeof ResumeContentSchema>

// Cover Letter
export const CoverLetterContentSchema = z.object({
  subject: z.string().optional(),
  body: z.string(),
})

export type CoverLetterContent = z.infer<typeof CoverLetterContentSchema>

// Document Schema
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: DocumentType,
  title: z.string(),
  content: z.union([ResumeContentSchema, CoverLetterContentSchema]),
  source: DocumentSource,
  role_id: z.string().uuid().optional().nullable(),
  version: z.number().default(1),
  created_at: z.string(),
})

export type Document = z.infer<typeof DocumentSchema>

// Match & Gap Analysis
export const SuggestedEditSchema = z.object({
  area: z.enum(['summary', 'skills', 'experience', 'projects']),
  suggestion: z.string(),
})

export const SuggestedBulletSchema = z.object({
  section: z.string(),
  bullet: z.string(),
  rationale: z.string(),
})

export const MatchGapAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()),
  suggestedEdits: z.array(SuggestedEditSchema),
  suggestedBullets: z.array(SuggestedBulletSchema),
})

export type MatchGapAnalysis = z.infer<typeof MatchGapAnalysisSchema>

// Follow-up Template
export const FollowUpTemplateSchema = z.object({
  stage: FollowUpStage,
  subject: z.string(),
  body: z.string(),
})

export type FollowUpTemplate = z.infer<typeof FollowUpTemplateSchema>

// Template Library
export const TemplateSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  type: TemplateType,
  name: z.string(),
  content: z.union([z.string(), z.record(z.any())]),
  created_at: z.string(),
})

export type Template = z.infer<typeof TemplateSchema>
