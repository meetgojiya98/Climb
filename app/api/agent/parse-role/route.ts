import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMWithRetry } from '@/lib/llm'
import { SYSTEM_PROMPTS, ROLE_PARSER_PROMPT, fillTemplate } from '@/lib/prompts'
import { RoleParsedSchema } from '@/lib/types'
import { z } from 'zod'

const RequestSchema = z.object({
  jobText: z.string().min(10),
})

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request
    const body = await request.json()
    const { jobText } = RequestSchema.parse(body)

    // Call LLM with retry
    const prompt = fillTemplate(ROLE_PARSER_PROMPT, { JOB_TEXT: jobText })
    
    let parsed: any
    let attempts = 0
    const maxAttempts = 2

    while (attempts <= maxAttempts) {
      try {
        const response = await callLLMWithRetry([
          { role: 'system', content: SYSTEM_PROMPTS.SAFETY },
          { role: 'user', content: prompt },
        ], 1, { temperature: 0.3, maxTokens: 2000 })

        // Parse JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }

        const parsedData = JSON.parse(jsonMatch[0])
        
        // Validate with Zod
        parsed = RoleParsedSchema.parse(parsedData)
        break
      } catch (error) {
        attempts++
        if (attempts > maxAttempts) {
          console.error('Failed to parse after retries:', error)
          // Fallback to basic parsing
          parsed = {
            title: '',
            company: '',
            location: '',
            responsibilities: [],
            requirements: [],
            keywords: [],
            mustHaves: [],
            niceToHaves: [],
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      parsed,
    })
  } catch (error: any) {
    console.error('Parse role error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to parse role' },
      { status: 500 }
    )
  }
}
