import { ResumeContentSchema, type ResumeContent } from '@/lib/types'

function toBullets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.replace(/^[-*•\s]+/, '').trim())
      .filter(Boolean)
  }

  return []
}

export function normalizeResumeContent(raw: any): ResumeContent {
  const strict = ResumeContentSchema.safeParse(raw)
  if (strict.success) return strict.data

  const personalInfo = raw?.personalInfo || {}
  const experiences = Array.isArray(raw?.experiences) ? raw.experiences : []
  const education = Array.isArray(raw?.education) ? raw.education : []
  const skills = Array.isArray(raw?.skills) ? raw.skills : []

  const fallback: ResumeContent = {
    header: {
      name: personalInfo.fullName || 'Candidate Name',
      email: personalInfo.email || undefined,
      phone: personalInfo.phone || undefined,
      location: personalInfo.location || undefined,
      links: [personalInfo.linkedin, personalInfo.portfolio].filter(Boolean),
    },
    headline: raw?.targetRole || undefined,
    summary: typeof raw?.summary === 'string' && raw.summary.trim().length > 0
      ? raw.summary
      : '[ADD PROFESSIONAL SUMMARY]',
    skills: [
      {
        category: 'Core Skills',
        items: skills.map((skill: any) => String(skill).trim()).filter(Boolean),
      },
    ],
    experience: experiences.map((exp: any) => ({
      company: exp?.company || '[ADD COMPANY]',
      title: exp?.title || '[ADD TITLE]',
      startDate: exp?.startDate || undefined,
      endDate: exp?.current ? null : exp?.endDate || undefined,
      bullets: toBullets(exp?.bullets || exp?.description || []),
    })),
    education: education.map((edu: any) => ({
      school: edu?.school || '[ADD SCHOOL]',
      credential: [edu?.degree, edu?.field].filter(Boolean).join(' in ') || '[ADD CREDENTIAL]',
      dates: edu?.graduationDate || undefined,
    })),
  }

  return ResumeContentSchema.parse(fallback)
}
