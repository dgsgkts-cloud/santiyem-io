/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as paymentDueReminder } from './payment-due-reminder.tsx'
import { template as paymentOverdueReminder } from './payment-overdue-reminder.tsx'
import { template as weeklySummary } from './weekly-summary.tsx'
import { template as signatureRequest } from './signature-request.tsx'
import { template as signatureReminder } from './signature-reminder.tsx'
import { template as signatureUploaded } from './signature-uploaded.tsx'
import { template as hakedisApprovalRequest } from './hakedis-approval-request.tsx'
import { template as hakedisApprovalResult } from './hakedis-approval-result.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'payment-due-reminder': paymentDueReminder,
  'payment-overdue-reminder': paymentOverdueReminder,
  'weekly-summary': weeklySummary,
  'signature-request': signatureRequest,
  'signature-reminder': signatureReminder,
  'signature-uploaded': signatureUploaded,
  'hakedis-approval-request': hakedisApprovalRequest,
  'hakedis-approval-result': hakedisApprovalResult,
}
