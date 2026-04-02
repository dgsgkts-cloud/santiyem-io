/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Şantiyem'
const BRAND_COLOR = '#FF6B2B'

interface SignatureUploadedProps {
  contractName?: string
  signerName?: string
  signerTitle?: string
  uploadDate?: string
  downloadUrl?: string
}

const SignatureUploadedEmail = ({
  contractName = 'Sözleşme',
  signerName = 'Bilinmeyen',
  signerTitle = '',
  uploadDate = '-',
  downloadUrl = '#',
}: SignatureUploadedProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>✅ {contractName} — İmzalı Versiyon Yüklendi</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>Şantiyem</Text>
        </Section>

        <Heading style={h1}>✅ İmzalı Sözleşme Yüklendi</Heading>
        <Text style={subtitle}>{contractName}</Text>

        <Hr style={divider} />

        <Section style={infoBox}>
          <Text style={infoText}>👤 İmzalayan: <strong>{signerName}</strong>{signerTitle ? ` — ${signerTitle}` : ''}</Text>
          <Text style={infoText}>📅 Tarih: {uploadDate}</Text>
        </Section>

        <Section style={ctaSection}>
          <Button href={downloadUrl} style={ctaButton}>
            📥 İmzalı Sözleşmeyi İndir
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          Bu bildirim {SITE_NAME} sözleşme takip sistemi tarafından gönderilmiştir.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignatureUploadedEmail,
  subject: (data: Record<string, any>) => `✅ ${data.contractName || 'Sözleşme'} — İmzalı Versiyon Yüklendi`,
  displayName: 'İmzalı sözleşme yüklendi bildirimi',
  previewData: {
    contractName: 'Akdeniz Residence İnşaat Sözleşmesi',
    signerName: 'Ahmet Kaya',
    signerTitle: 'Genel Müdür',
    uploadDate: '05.04.2025',
    downloadUrl: 'https://example.com/download',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#22C55E', margin: '0 0 8px', textAlign: 'center' as const }
const subtitle = { fontSize: '14px', color: '#64748B', margin: '0 0 20px', textAlign: 'center' as const }
const divider = { borderColor: '#E2E8F0', margin: '20px 0' }
const infoBox = { backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '16px', marginBottom: '20px' }
const infoText = { fontSize: '13px', color: '#166534', margin: '0 0 8px' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const ctaButton = { backgroundColor: '#22C55E', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '20px 0 4px', textAlign: 'center' as const }
