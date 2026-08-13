/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "AdaptivePrep"

interface Props {
  userName?: string | null
  accessUntil?: string | null
  reason?: string | null
}

const fmt = (iso?: string | null) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}

const SubscriptionCancelledEmail = ({ userName, accessUntil }: Props) => {
  const until = fmt(accessUntil)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your {SITE_NAME} subscription has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Heading style={logo}>{SITE_NAME}</Heading>
          </Section>
          <Heading style={h1}>Your subscription is cancelled</Heading>
          <Text style={text}>
            {userName ? `Hi ${userName},` : 'Hi there,'} we've turned off automatic renewal for your
            {' '}{SITE_NAME} subscription. You will not be charged again.
          </Text>
          <Section style={card}>
            <Text style={cardTitle}>What happens next</Text>
            <Text style={cardMeta}>
              {until
                ? `You keep full access to your current plan until ${until}.`
                : 'You keep access for the remainder of the period you already paid for.'}
            </Text>
            <Text style={cardMeta}>After that your account moves to the Free plan — your data, progress and test history stay intact.</Text>
            <Text style={cardDesc}>Changed your mind? You can resubscribe any time from Billing &amp; Plans; nothing is deleted.</Text>
          </Section>
          <Section style={buttonSection}>
            <Button style={button} href="https://adaptiveprep.org/dashboard/billing">
              Manage Billing
            </Button>
          </Section>
          <Text style={text}>
            Thanks for studying with us. If something went wrong, just reply to this email or write to
            {' '}hello@adaptiveprep.org — we read every message.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} — Your AI-powered study companion</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubscriptionCancelledEmail,
  subject: `Your ${SITE_NAME} subscription has been cancelled`,
  displayName: 'Subscription cancelled',
  previewData: {
    userName: 'Alex',
    accessUntil: new Date(Date.now() + 12 * 86400000).toISOString(),
    reason: 'too_expensive',
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
