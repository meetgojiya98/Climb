import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeResumeContent } from '@/lib/export/normalize-resume'
import { renderResumeToPdfBuffer } from '@/lib/export/pdf'

const RequestSchema = z.object({
  resume: z.any(),
  fileName: z.string().optional(),
})

function buildFileName(name?: string): string {
  if (!name) return 'climb-resume'
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'climb-resume'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resume, fileName } = RequestSchema.parse(body)

    const normalized = normalizeResumeContent(resume)
    const buffer = await renderResumeToPdfBuffer(normalized)
    const bytes = new Uint8Array(buffer)
    const downloadName = `${buildFileName(fileName || normalized.header.name)}.pdf`

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Failed to export PDF',
      },
      { status: 400 }
    )
  }
}
