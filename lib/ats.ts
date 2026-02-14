interface SectionScore {
  section: string
  score: number
  tip: string
}

interface KeywordAnalysis {
  found: string[]
  missing: string[]
}

export interface ATSAnalysisResult {
  score: number
  strengths: string[]
  improvements: string[]
  keywords: KeywordAnalysis
  sectionScores: SectionScore[]
}

export interface ATSJobContext {
  keywords?: string[]
  requirements?: string[]
  mustHaves?: string[]
}

const DEFAULT_KEYWORDS = [
  'communication',
  'leadership',
  'collaboration',
  'problem solving',
  'project management',
  'stakeholder management',
  'data analysis',
  'agile',
]

const TOKEN_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'your',
  'our', 'you', 'are', 'was', 'were', 'their', 'about', 'through', 'into', 'across',
  'responsible', 'using', 'used', 'built', 'build', 'role', 'team', 'work',
])

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !TOKEN_STOP_WORDS.has(word))
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function extractResumeText(content: any): string {
  if (!content || typeof content !== 'object') return ''
  const lines: string[] = []

  if (content.personalInfo) {
    const p = content.personalInfo
    lines.push(p.fullName, p.email, p.phone, p.location, p.linkedin, p.portfolio)
  }

  if (content.summary) lines.push(content.summary)

  if (Array.isArray(content.experiences)) {
    content.experiences.forEach((exp: any) => {
      lines.push(exp?.title, exp?.company, exp?.description)
    })
  }

  if (Array.isArray(content.education)) {
    content.education.forEach((edu: any) => {
      lines.push(edu?.degree, edu?.field, edu?.school)
    })
  }

  if (Array.isArray(content.skills)) {
    lines.push(content.skills.join(' '))
  }

  return lines.filter(Boolean).join(' ')
}

function checkKeywordFound(keyword: string, normalizedText: string, tokenSet: Set<string>): boolean {
  if (keyword.includes(' ')) {
    return normalizedText.includes(keyword)
  }
  return tokenSet.has(keyword)
}

export function analyzeResumeATS(content: any, jobContext?: ATSJobContext): ATSAnalysisResult {
  const personalInfo = content?.personalInfo || {}
  const experiences = Array.isArray(content?.experiences) ? content.experiences : []
  const education = Array.isArray(content?.education) ? content.education : []
  const skills = Array.isArray(content?.skills) ? content.skills : []

  const resumeText = extractResumeText(content)
  const normalizedText = resumeText.toLowerCase()
  const tokenSet = new Set(tokenize(resumeText))

  const targetKeywords = unique(
    [
      ...(jobContext?.keywords || []),
      ...(jobContext?.mustHaves || []),
      ...DEFAULT_KEYWORDS,
    ]
      .map(normalizeKeyword)
      .filter((keyword) => keyword.length > 2)
  ).slice(0, 24)

  const foundKeywords = targetKeywords.filter((keyword) => checkKeywordFound(keyword, normalizedText, tokenSet))
  const missingKeywords = targetKeywords.filter((keyword) => !foundKeywords.includes(keyword))

  const contactFields = [personalInfo.fullName, personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean).length
  const contactScore = clampScore(35 + contactFields * 15)

  const summaryLength = typeof content?.summary === 'string' ? content.summary.trim().length : 0
  const summaryScore = summaryLength === 0 ? 45 : clampScore(70 + Math.min(25, summaryLength / 8))

  const quantifiedExperienceCount = experiences.filter((exp: any) =>
    /\d+%|\$?\d[\d,.]*|increased|reduced|grew|improved|saved|launched|delivered/i.test(String(exp?.description || ''))
  ).length
  const experienceScore = experiences.length === 0
    ? 40
    : clampScore(60 + Math.min(25, experiences.length * 8) + Math.min(15, quantifiedExperienceCount * 6))

  const educationScore = education.length > 0 ? 85 : 60
  const skillsScore = skills.length === 0 ? 45 : clampScore(65 + Math.min(25, skills.length * 4))

  const keywordCoverage = targetKeywords.length > 0 ? foundKeywords.length / targetKeywords.length : 0.5
  const keywordScore = clampScore(keywordCoverage * 100)

  const baseScore = (
    contactScore * 0.16 +
    summaryScore * 0.18 +
    experienceScore * 0.30 +
    educationScore * 0.12 +
    skillsScore * 0.14 +
    keywordScore * 0.10
  )
  const score = clampScore(baseScore)

  const sectionScores: SectionScore[] = [
    { section: 'Contact & Header', score: contactScore, tip: 'Include full name, email, phone, and location in one clear header line.' },
    { section: 'Professional Summary', score: summaryScore, tip: 'Use 2-3 concise lines with role keywords and measurable strengths.' },
    { section: 'Work Experience', score: experienceScore, tip: 'Prioritize impact bullets with metrics and role-relevant outcomes.' },
    { section: 'Education', score: educationScore, tip: 'Include degree, institution, and date; add relevant coursework if helpful.' },
    { section: 'Skills', score: skillsScore, tip: 'Keep skills specific and aligned to target role requirements.' },
  ]

  const strengths: string[] = []
  if (contactScore >= 80) strengths.push('Complete contact header with recruiter-friendly formatting')
  if (summaryScore >= 80) strengths.push('Summary is present and communicates a clear professional narrative')
  if (experienceScore >= 80) strengths.push('Experience section shows strong, impact-oriented content')
  if (skillsScore >= 80) strengths.push('Skills section is broad and ATS-parsable')
  if (foundKeywords.length >= 6) strengths.push('Strong keyword coverage against common hiring filters')
  if (strengths.length === 0) {
    strengths.push('Resume has a solid foundation to iterate on quickly')
  }

  const improvements: string[] = []
  if (summaryScore < 75) improvements.push('Add or tighten your summary with role-specific language and outcomes.')
  if (experienceScore < 75) improvements.push('Increase quantified achievements in experience bullets.')
  if (skillsScore < 75) improvements.push('Expand the skills section with tools and domain-specific terms.')
  if (missingKeywords.length > 0) improvements.push(`Incorporate missing keywords where truthful: ${missingKeywords.slice(0, 5).join(', ')}.`)
  if (improvements.length === 0) {
    improvements.push('Tailor this resume to each role by reordering bullets around job priorities.')
  }

  return {
    score,
    strengths,
    improvements,
    keywords: {
      found: foundKeywords.slice(0, 12),
      missing: missingKeywords.slice(0, 12),
    },
    sectionScores,
  }
}
