/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeEmail } from './welcome-email.tsx'
import { template as subscriptionCancelled } from './subscription-cancelled.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as renewalReminder } from './renewal-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome-email': welcomeEmail,
  'subscription-cancelled': subscriptionCancelled,
  'payment-receipt': paymentReceipt,
  'renewal-reminder': renewalReminder,
}
