/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AdaptivePrep"

interface ActivityReminderProps {
  studentName?: string
  daysSinceActive?: number
  senderName?: string
}

const ActivityReminderEmail = ({
  studentName,
  daysSinceActive,
  senderName,
}: ActivityReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We miss you! Come back and keep learning</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h1}>
          👋 We miss you!
        </Heading>
        <Text style={text}>
          {studentName ? `Hey ${studentName},` : 'Hey there,'} it's been
          {daysSinceActive ? ` ${daysSinceActive} days` : ' a while'} since
          you last studied on {SITE_NAME}.
        </Text>
        <Text style={text}>
          {senderName ? `${senderName} noticed you've been away and wanted to check in. ` : ''}
          Your learning journey is waiting — even 10 minutes a day can make a big difference!
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>🎯 Quick ways to jump back in:</Text>
          <Text style={cardMeta}>• Take a quick practice test</Text>
          <Text style={cardMeta}>• Review your flashcards</Text>
          <Text style={cardMeta}>• Chat with your AI tutor</Text>
        </Section>
        <Section style={buttonSection}>
          <Button style={button} href="https://adaptive-prep-ai.lovable.app/dashboard">
            Back to Learning
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
  component: ActivityReminderEmail,
  subject: () => `We miss you! Come back and keep learning 📚`,
  displayName: 'Activity reminder',
  previewData: {
    studentName: 'Alex',
    daysSinceActive: 5,
    senderName: 'Ms. Johnson',
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
