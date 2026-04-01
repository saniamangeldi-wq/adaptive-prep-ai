/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AdaptivePrep"

interface AssignmentNotificationProps {
  studentName?: string
  assignmentTitle?: string
  subject?: string
  dueDate?: string
  description?: string
  teacherName?: string
}

const AssignmentNotificationEmail = ({
  studentName,
  assignmentTitle,
  subject,
  dueDate,
  description,
  teacherName,
}: AssignmentNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New assignment: {assignmentTitle || 'Untitled'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h1}>
          📝 New Assignment
        </Heading>
        <Text style={text}>
          {studentName ? `Hey ${studentName},` : 'Hey there,'} you have a new assignment
          {teacherName ? ` from ${teacherName}` : ''}.
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>{assignmentTitle || 'Untitled Assignment'}</Text>
          {subject && <Text style={cardMeta}>📚 {subject}</Text>}
          {dueDate && <Text style={cardMeta}>📅 Due: {dueDate}</Text>}
          {description && <Text style={cardDesc}>{description}</Text>}
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href="https://adaptive-prep-ai.lovable.app/dashboard/assignments">
            View Assignment
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} — Your AI-powered study companion
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AssignmentNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New assignment: ${data.assignmentTitle || 'Check your dashboard'}`,
  displayName: 'Assignment notification',
  previewData: {
    studentName: 'Alex',
    assignmentTitle: 'Chapter 5 Review Quiz',
    subject: 'Math',
    dueDate: 'January 20, 2026',
    description: 'Complete the review quiz covering quadratic equations.',
    teacherName: 'Ms. Johnson',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { padding: '20px 0 10px' }
const logo = { fontSize: '20px', fontWeight: '700' as const, color: 'hsl(168, 76%, 42%)', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a2e', margin: '20px 0 16px' }
const text = { fontSize: '15px', color: '#555770', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f8f9fa', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px' }
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 8px' }
const cardMeta = { fontSize: '14px', color: '#555770', margin: '0 0 4px' }
const cardDesc = { fontSize: '14px', color: '#777', margin: '8px 0 0', lineHeight: '1.5' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(168, 76%, 42%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '0.75rem',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999', margin: '0' }
