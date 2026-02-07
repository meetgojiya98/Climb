import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { SYSTEM_PROMPTS, IMPROVE_BULLET_PROMPT, fillTemplate } from '@/lib/prompts'
import { z } from 'zod'

const RequestSchema = z.object({
  bullet: z.string(),
  instruction: z.string(),
  context: z.object({
    roleTitle: z.string().optional(),
    company: z.string().optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bullet, instruction, context } = RequestSchema.parse(body)

    const prompt = fillTemplate(IMPROVE_BULLET_PROMPT, {
      BULLET: bullet,
      ROLE_TITLE: context?.roleTitle || 'N/A',
      COMPANY: context?.company || 'N/A',
      INSTRUCTION: instruction,
    })

    const response = await callLLMWithRetry([
      { role: 'system', content: SYSTEM_PROMPTS.SAFETY + '\n' + SYSTEM_PROMPTS.ATS_SAFE },
      { role: 'user', content: prompt },
    ], 2, { temperature: 0.6, maxTokens: 200 })

    const improvedBullet = response.content.trim().replace(/^["']|["']$/g, '')

    return NextResponse.json({
      success: true,
      improvedBullet,
    })
  } catch (error: any) {
    console.error('Improve bullet error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to improve bullet' },
      { status: 500 }
    )
  }
}
