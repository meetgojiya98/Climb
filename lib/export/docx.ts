import * as Docx from 'docx'
import type { ResumeContent } from '@/lib/types'

const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = Docx

function heading(text: string): Docx.Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 120 },
  })
}

function normal(text: string): Docx.Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 90 },
  })
}

function bullet(text: string): Docx.Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 70 },
  })
}

export async function generateResumeDOCX(resume: ResumeContent): Promise<Buffer> {
  const children: Docx.Paragraph[] = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: resume.header.name, bold: true, size: 36 })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
    })
  )

  const contactLine = [
    resume.header.email,
    resume.header.phone,
    resume.header.location,
    ...(resume.header.links || []),
  ]
    .filter(Boolean)
    .join(' | ')

  if (contactLine) children.push(normal(contactLine))
  if (resume.headline) children.push(normal(resume.headline))

  children.push(heading('SUMMARY'))
  children.push(normal(resume.summary))

  if (resume.skills.length > 0) {
    children.push(heading('SKILLS'))
    resume.skills.forEach((group) => {
      children.push(
        normal(`${group.category}: ${group.items.join(', ')}`)
      )
    })
  }

  if (resume.experience.length > 0) {
    children.push(heading('EXPERIENCE'))
    resume.experience.forEach((exp) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${exp.title} | ${exp.company}`, bold: true })],
          spacing: { after: 40 },
        })
      )

      const dateLine = [exp.startDate, exp.endDate || 'Present'].filter(Boolean).join(' - ')
      if (dateLine) children.push(normal(dateLine))
      exp.bullets.forEach((item) => children.push(bullet(item)))
    })
  }

  if (resume.projects && resume.projects.length > 0) {
    children.push(heading('PROJECTS'))
    resume.projects.forEach((project) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: project.name, bold: true })],
          spacing: { after: 40 },
        })
      )
      if (project.techStack?.length) {
        children.push(normal(`Tech: ${project.techStack.join(', ')}`))
      }
      project.bullets.forEach((item) => children.push(bullet(item)))
    })
  }

  if (resume.education && resume.education.length > 0) {
    children.push(heading('EDUCATION'))
    resume.education.forEach((edu) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${edu.credential} | ${edu.school}`, bold: true })],
          spacing: { after: 40 },
        })
      )
      if (edu.dates) children.push(normal(edu.dates))
    })
  }

  if (resume.certifications && resume.certifications.length > 0) {
    children.push(heading('CERTIFICATIONS'))
    resume.certifications.forEach((item) => children.push(bullet(item)))
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
