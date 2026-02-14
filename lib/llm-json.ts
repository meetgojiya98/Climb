import { z } from 'zod'

type JsonShape = 'object' | 'array'

const CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)```/gi

function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function extractBalancedJson(text: string, shape: JsonShape): string | null {
  const open = shape === 'array' ? '[' : '{'
  const close = shape === 'array' ? ']' : '}'
  let depth = 0
  let start = -1
  let inString = false
  let isEscaped = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inString) {
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === open) {
      if (depth === 0) start = i
      depth++
      continue
    }

    if (char === close && depth > 0) {
      depth--
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1)
      }
    }
  }

  return null
}

function collectCandidates(raw: string, shape: JsonShape): string[] {
  const candidates: string[] = []
  const trimmed = raw.trim()
  if (trimmed) candidates.push(trimmed)

  for (const match of raw.matchAll(CODE_BLOCK_REGEX)) {
    const code = match[1]?.trim()
    if (code) candidates.push(code)
  }

  const balanced = extractBalancedJson(raw, shape)
  if (balanced) candidates.push(balanced)

  return [...new Set(candidates)]
}

export function parseLLMJson<T>(
  raw: string,
  schema: z.ZodType<T>,
  shape: JsonShape
): T {
  const candidates = collectCandidates(raw, shape)

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate)
    if (parsed !== null) {
      const result = schema.safeParse(parsed)
      if (result.success) {
        return result.data
      }
    }
  }

  throw new Error('Could not parse structured JSON from model response')
}
