import { NextRequest, NextResponse } from 'next/server'

// DOCX export temporarily disabled (docx package API mismatch).
// Use "Save as PDF" from the resume view (browser print) instead.
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'DOCX export is not available. Use "Save as PDF" on the resume view.' },
    { status: 501 }
  )
}
