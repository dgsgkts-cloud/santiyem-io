/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Şantiyem'
const BRAND_COLOR = '#FF6B2B'

interface SignatureReminderProps {
  recipientName?: string
  contractName?: string
  uploadUrl?: string
  sentDate?: string
}

const SignatureReminderEmail = ({
  recipientName = 'Sayın Yetkili',
  contractName = 'Sözleşme',
  uploadUrl = '#',
  sentDate = '-',
}: SignatureReminderProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Hatırlatma: {contractName} İmzası Bekleniyor</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>Şantiyem</Text>
          <Text style={logoSubtext}>Şantiyenizi Tek Panelden Yönetin</Text>
        </Section>

        <Heading style={h1}>Hatırlatma: İmza Bekleniyor</Heading>
        <Text style={subtitle}>{contractName}</Text>

        <Hr style={divider} />

        <Text style={text}>
          Sayın {recipientName},
        </Text>
        <Text style={text}>
          {sentDate} tarihinde gönderdiğimiz sözleşmenin imzalı versiyonunu henüz almadık. Lütfen en kısa sürede iletiniz.
        </Text>

        <Section style={ctaSection}>
          <Button href={uploadUrl} style={ctaButton}>
            Sözleşmeyi İncele ve İmzalı Versiyonu Yükle
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          Bu e-posta {SITE_NAME} sözleşme takip sistemi üzerinden gönderilmiştir.
        </Text>
        <Text style={footerSmall}>
          Göktaş Global Mühendislik | info@goktasglobal.com | +90 (542) 781 81 81
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignatureReminderEmail,
  subject: (data: Record<string, any>) => `Hatırlatma: ${data.contractName || 'Sözleşme'} İmzası Bekleniyor`,
  displayName: 'Sözleşme imza hatırlatması',
  previewData: {
    recipientName: 'Ahmet Kaya',
    contractName: 'Akdeniz Residence İnşaat Sözleşmesi',
    uploadUrl: 'https://santiyem.lovable.app/sozlesme-imza/abc123',
    sentDate: '02.04.2025',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Arial', 'Helvetica', sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '20px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 8px', textAlign: 'center' as const }
const subtitle = { fontSize: '14px', color: '#64748B', margin: '0 0 20px', textAlign: 'center' as const }
const divider = { borderColor: '#E2E8F0', margin: '20px 0' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const ctaButton = { backgroundColor: '#F59E0B', color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '20px 0 4px', textAlign: 'center' as const }
const footerSmall = { fontSize: '11px', color: '#CBD5E1', margin: '0', textAlign: 'center' as const }
