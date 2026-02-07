import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { SYSTEM_PROMPTS, COVER_LETTER_PROMPT, fillTemplate } from '@/lib/prompts'
import { RoleParsedSchema } from '@/lib/types'
import { z } from 'zod'

const RequestSchema = z.object({
  jobText: z.string().min(20).optional(),
  parsed: RoleParsedSchema.optional(),
  resumeSummary: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.LLM_API_KEY) {
      return NextResponse.json(
        { error: 'LLM not configured. Add LLM_API_KEY to enable AI-generated cover letters.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { jobText, parsed: parsedInput, resumeSummary } = RequestSchema.parse(body)

    let parsed = parsedInput
    if (!parsed && jobText) {
      const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (request.nextUrl?.origin ?? 'http://localhost:3000')
      const parseRes = await fetch(`${base}/api/agent/parse-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
        body: JSON.stringify({ jobText }),
      })
      const parseData = await parseRes.json()
      if (parseData.parsed) parsed = RoleParsedSchema.parse(parseData.parsed)
    }

    if (!parsed) {
      return NextResponse.json({ error: 'Provide jobText or parsed role data' }, { status: 400 })
    }

    const roleStr = JSON.stringify({
      title: parsed.title,
      company: parsed.company,
      location: parsed.location,
      requirements: parsed.requirements,
      keywords: parsed.keywords,
      responsibilities: parsed.responsibilities,
    }, null, 2)

    const resumeStr = resumeSummary?.trim()
      ? `Candidate summary: ${resumeSummary}`
      : 'Candidate with relevant experience and skills for the role.'

    const prompt = fillTemplate(COVER_LETTER_PROMPT, {
      RESUME: resumeStr,
      ROLE: roleStr,
      TONE: 'professional',
    })

    const response = await callLLMWithRetry(
      [
        { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
        { role: 'user', content: prompt },
      ],
      2,
      { temperature: 0.6, maxTokens: 1500 }
    )

    const match = response.content.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: 'Could not parse cover letter from AI' }, { status: 500 })
    }

    const letter = z.object({ subject: z.string().optional(), body: z.string() }).parse(JSON.parse(match[0]))

    return NextResponse.json({
      company: parsed.company || '',
      title: parsed.title || '',
      body: letter.body,
      subject: letter.subject,
    })
  } catch (error: any) {
    console.error('Cover letter from posting error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate cover letter' },
      { status: 500 }
    )
  }
}
