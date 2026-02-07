// LLM client wrapper for OpenAI-compatible APIs
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function callLLM(
  messages: LLMMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  }
): Promise<LLMResponse> {
  const baseURL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1'
  const apiKey = process.env.LLM_API_KEY
  const envModel = process.env.LLM_MODEL || ''
  const model = envModel && !/gpt-4-turbo-preview|gpt-4-1106-preview/i.test(envModel)
    ? envModel
    : 'gpt-4o'

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured')
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stream: options?.stream ?? false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LLM API error: ${error}`)
  }

  const data = await response.json()
  
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
  }
}

export async function callLLMWithRetry(
  messages: LLMMessage[],
  maxRetries = 2,
  options?: {
    temperature?: number
    maxTokens?: number
  }
): Promise<LLMResponse> {
  let lastError: Error | null = null

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await callLLM(messages, options)
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }

  throw lastError || new Error('Failed to call LLM')
}
