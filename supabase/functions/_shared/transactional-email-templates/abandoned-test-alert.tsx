/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AdaptivePrep"

interface AbandonedTestAlertProps {
  mentorName?: string
  studentName?: string
  abandonedCount?: number
  questionsDeducted?: number
  warningOnly?: boolean
  questionsRemaining?: number
}

const AbandonedTestAlertEmail = ({
  mentorName,
  studentName,
  abandonedCount,
  questionsDeducted,
  warningOnly,
  questionsRemaining,
}: AbandonedTestAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{studentName || 'A student'} left a practice test unfinished</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h1}>Unfinished practice test</Heading>
        <Text style={text}>
          {mentorName ? `Hi ${mentorName},` : 'Hi there,'} {studentName || 'a student'} started a new
          practice test while leaving {abandonedCount && abandonedCount > 1 ? `${abandonedCount} tests` : 'a test'} unfinished.
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>{studentName || 'Student'}</Text>
          <Text style={cardMeta}>Unfinished tests flagged: {abandonedCount ?? 1}</Text>
          <Text style={cardMeta}>
            {warningOnly
              ? 'First occurrence — warning only, no questions deducted.'
              : `Questions deducted from their bank: ${questionsDeducted ?? 0}`}
          </Text>
          <Text style={cardMeta}>Questions remaining: {questionsRemaining ?? 0}</Text>
          <Text style={cardDesc}>
            Unfinished tests are never counted in progress or scores, so their reported results stay accurate.
          </Text>
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href="https://adaptiveprep.org/dashboard">
            Open Dashboard
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
  component: AbandonedTestAlertEmail,
  subject: (data: Record<string, any>) =>
    `${data.studentName || 'A student'} left a practice test unfinished`,
  displayName: 'Abandoned test alert',
  previewData: {
    mentorName: 'Ms. Johnson',
    studentName: 'Alex',
    abandonedCount: 1,
    questionsDeducted: 44,
    warningOnly: false,
    questionsRemaining: 120,
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
