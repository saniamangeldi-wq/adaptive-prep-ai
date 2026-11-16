/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AdaptivePrep"

interface WelcomeEmailProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — check your first IELTS essay</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Heading style={h1}>
          {name ? `Welcome, ${name}` : 'Welcome to AdaptivePrep'}
        </Heading>
        <Text style={text}>
          AdaptivePrep checks your IELTS Writing answers and shows you what to
          fix first. Band scores are estimates, not official results.
        </Text>
        <Text style={text}>Here is what you can do right away:</Text>
        <Text style={listItem}>Write or paste a Task 1 or Task 2 answer</Text>
        <Text style={listItem}>Get an estimated band on the four criteria</Text>
        <Text style={listItem}>Ask the coach why a sentence lost marks</Text>
        <Section style={buttonSection}>
          <Button style={button} href="https://adaptive-prep-ai.lovable.app/dashboard">
            Go to Dashboard
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          The {SITE_NAME} team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to AdaptivePrep',
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const headerSection = { padding: '20px 0 10px' }
const logo = { fontSize: '20px', fontWeight: '700' as const, color: 'hsl(168, 76%, 42%)', margin: '0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a2e', margin: '20px 0 16px' }
const text = { fontSize: '15px', color: '#555770', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '15px', color: '#555770', lineHeight: '1.6', margin: '0 0 8px', paddingLeft: '4px' }
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
