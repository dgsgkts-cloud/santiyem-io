/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Şantiyem'
const BRAND_COLOR = '#FF6B2B'

interface SignatureRequestProps {
  recipientName?: string
  contractName?: string
  message?: string
  uploadUrl?: string
  deadline?: string
  senderName?: string
}

const SignatureRequestEmail = ({
  recipientName = 'Sayın Yetkili',
  contractName = 'Sözleşme',
  message = '',
  uploadUrl = '#',
  deadline,
  senderName = '',
}: SignatureRequestProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>İmza Bekleniyor: {contractName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>Şantiyem</Text>
          <Text style={logoSubtext}>Şantiyenizi Tek Panelden Yönetin</Text>
        </Section>

        <Heading style={h1}>İmza Bekleniyor</Heading>
        <Text style={subtitle}>{contractName}</Text>

        <Hr style={divider} />

        {message && (
          <Text style={messageStyle}>{message}</Text>
        )}

        {deadline && (
          <Section style={deadlineBox}>
            <Text style={deadlineText}>⏰ İmza için son tarih: {new Date(deadline).toLocaleDateString('tr-TR')}</Text>
          </Section>
        )}

        <Section style={ctaSection}>
          <Button href={uploadUrl} style={ctaButton}>
            Sözleşmeyi İncele ve İmzalı Versiyonu Yükle
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          Bu e-posta {SITE_NAME} sözleşme takip sistemi üzerinden gönderilmiştir.
          {senderName && ` Gönderen: ${senderName}`}
        </Text>
        <Text style={footerSmall}>
          Göktaş Global Mühendislik | info@goktasglobal.com | +90 (542) 781 81 81
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignatureRequestEmail,
  subject: (data: Record<string, any>) => `İmza Bekleniyor: ${data.contractName || 'Sözleşme'}`,
  displayName: 'Sözleşme imza talebi',
  previewData: {
    recipientName: 'Ahmet Kaya',
    contractName: 'Akdeniz Residence İnşaat Sözleşmesi',
    message: 'Sayın Ahmet Bey,\n\nAkdeniz Residence sözleşmesini incelemeniz için iletiyoruz.',
    uploadUrl: 'https://santiyem.lovable.app/sozlesme-imza/abc123',
    deadline: '2025-06-15',
    senderName: 'Doğuş G.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 8px', textAlign: 'center' as const }
const subtitle = { fontSize: '14px', color: '#64748B', margin: '0 0 20px', textAlign: 'center' as const }
const divider = { borderColor: '#E2E8F0', margin: '20px 0' }
const messageStyle = { fontSize: '14px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const, margin: '0 0 20px' }
const deadlineBox = { backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }
const deadlineText = { fontSize: '13px', color: '#92400E', margin: '0', fontWeight: '600' as const }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const ctaButton = { backgroundColor: '#3B82F6', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '20px 0 4px', textAlign: 'center' as const }
const footerSmall = { fontSize: '11px', color: '#CBD5E1', margin: '0', textAlign: 'center' as const }
