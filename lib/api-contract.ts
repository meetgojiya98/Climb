import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export class ApiContractError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  const payload = await request.json().catch(() => null)
  const result = schema.safeParse(payload)
  if (!result.success) {
    throw new ApiContractError(result.error.issues[0]?.message || "Invalid request body", 400)
  }
  return result.data
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status }
  )
}
