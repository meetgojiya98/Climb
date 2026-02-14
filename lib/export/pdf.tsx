import * as ReactPDF from '@react-pdf/renderer'
import { ResumeContent } from '@/lib/types'

const pdfModule = ReactPDF as any
const pdfAPI = pdfModule.default || pdfModule
const Document = pdfAPI.Document || pdfModule.Document
const Page = pdfAPI.Page || pdfModule.Page
const Text = pdfAPI.Text || pdfModule.Text
const View = pdfAPI.View || pdfModule.View
const StyleSheet = pdfAPI.StyleSheet || pdfModule.StyleSheet
const styleSheetFactory = StyleSheet?.create
  ? StyleSheet
  : { create: <T,>(value: T) => value }

// Define ATS-safe styles
const styles = styleSheetFactory.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contact: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  headline: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottom: '1 solid #000',
    paddingBottom: 2,
  },
  subsection: {
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 3,
    paddingLeft: 12,
  },
  skillCategory: {
    marginBottom: 6,
  },
  skillCategoryName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  skillItems: {
    fontSize: 10,
    color: '#333',
  },
})

interface ResumePDFProps {
  resume: ResumeContent
}

export function ResumePDF({ resume }: ResumePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.header.name}</Text>
          {resume.header.email && (
            <Text style={styles.contact}>{resume.header.email}</Text>
          )}
          {resume.header.phone && (
            <Text style={styles.contact}>{resume.header.phone}</Text>
          )}
          {resume.header.location && (
            <Text style={styles.contact}>{resume.header.location}</Text>
          )}
          {resume.header.links && resume.header.links.length > 0 && (
            <Text style={styles.contact}>{resume.header.links.join(' | ')}</Text>
          )}
          {resume.headline && (
            <Text style={styles.headline}>{resume.headline}</Text>
          )}
        </View>

        {/* Summary */}
        {resume.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SUMMARY</Text>
            <Text style={{ fontSize: 10 }}>{resume.summary}</Text>
          </View>
        )}

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS</Text>
            {resume.skills.map((skillCat, index) => (
              <View key={index} style={styles.skillCategory}>
                <Text style={styles.skillCategoryName}>{skillCat.category}:</Text>
                <Text style={styles.skillItems}>{skillCat.items.join(', ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXPERIENCE</Text>
            {resume.experience.map((exp, index) => (
              <View key={index} style={styles.subsection}>
                <Text style={styles.title}>{exp.title}</Text>
                <Text style={styles.subtitle}>
                  {exp.company}
                  {exp.startDate && ` | ${exp.startDate}`}
                  {exp.endDate !== undefined && ` - ${exp.endDate || 'Present'}`}
                </Text>
                {exp.bullets.map((bullet, i) => (
                  <Text key={i} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {resume.projects && resume.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>
            {resume.projects.map((project, index) => (
              <View key={index} style={styles.subsection}>
                <Text style={styles.title}>{project.name}</Text>
                {project.techStack && project.techStack.length > 0 && (
                  <Text style={styles.subtitle}>
                    Technologies: {project.techStack.join(', ')}
                  </Text>
                )}
                {project.bullets.map((bullet, i) => (
                  <Text key={i} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EDUCATION</Text>
            {resume.education.map((edu, index) => (
              <View key={index} style={styles.subsection}>
                <Text style={styles.title}>{edu.credential}</Text>
                <Text style={styles.subtitle}>
                  {edu.school}
                  {edu.dates && ` | ${edu.dates}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {resume.certifications && resume.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
            {resume.certifications.map((cert, index) => (
              <Text key={index} style={styles.bullet}>
                • {cert}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}

export async function renderResumeToPdfBuffer(resume: ResumeContent): Promise<Buffer> {
  const renderer = await import('@react-pdf/renderer')
  const renderToBuffer =
    (renderer as any).renderToBuffer ||
    (renderer as any).default?.renderToBuffer

  if (typeof renderToBuffer !== 'function') {
    throw new Error('renderToBuffer is unavailable in @react-pdf/renderer')
  }

  const element = <ResumePDF resume={resume} />
  return renderToBuffer(element)
}
