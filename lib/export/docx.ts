import type { ResumeContent } from '@/lib/types'

/** DOCX export stub – use "Save as PDF" from resume view. Package API mismatch with current docx version. */
export async function generateResumeDOCX(_resume: ResumeContent): Promise<Blob> {
  throw new Error('DOCX export is not available. Use "Save as PDF" on the resume view.')
}
