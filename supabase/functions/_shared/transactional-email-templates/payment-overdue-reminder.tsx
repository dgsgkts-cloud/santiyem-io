/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface PaymentOverdueReminderProps {
  projectName?: string
  hakedisNo?: string
  amount?: string
  dueDate?: string
  daysOverdue?: string
  interestAmount?: string
  detailUrl?: string
}

const PaymentOverdueReminderEmail = ({
  projectName = 'Proje',
  hakedisNo = '1',
  amount = '₺0',
  dueDate = '-',
  daysOverdue = '30',
  interestAmount = '₺0',
  detailUrl = '#',
}: PaymentOverdueReminderProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>⚠️ {projectName} Hakediş #{hakedisNo} {daysOverdue} Gündür Ödenmedi</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>
            <span style={{ color: '#FF6B2B', fontWeight: 800 }}>Mühendis</span>
            <span style={{ color: '#F1F5F9', fontWeight: 800 }}>AI</span>
          </Text>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>⚠️ Gecikmiş Hakediş Uyarısı</Heading>

          <Text style={text}>Merhaba,</Text>

          <Text style={text}>
            <strong>{projectName}</strong> projesine ait <strong>Hakediş #{hakedisNo}</strong>,{' '}
            <strong style={{ color: '#EF4444' }}>{daysOverdue} gündür</strong> ödenmemiş durumda.
          </Text>

          <Section style={alertBox}>
            <Text style={alertLabel}>PROJE</Text>
            <Text style={alertValue}>{projectName}</Text>
            <Text style={alertLabel}>HAKEDİŞ TUTARI</Text>
            <Text style={alertValue}>{amount}</Text>
            <Text style={alertLabel}>VADE TARİHİ</Text>
            <Text style={alertValue}>{dueDate}</Text>
            <Text style={alertLabel}>GECİKME SÜRESİ</Text>
            <Text style={{ ...alertValue, color: '#EF4444' }}>{daysOverdue} gün</Text>
            <Text style={alertLabel}>TAHMİNİ YASAL FAİZ</Text>
            <Text style={{ ...alertValue, color: '#EF4444' }}>{interestAmount}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={detailUrl}>
              Hakediş Detayını Gör
            </Button>
          </Section>

          <Text style={warningText}>
            3095 sayılı Kanun kapsamında gecikmiş ödemeler için yasal faiz talep hakkınız bulunmaktadır.
            Gerekli durumlarda ihtarname hazırlayabilirsiniz.
          </Text>
        </Section>

        <Hr style={hr} />
        <Section style={footerSection}>
          <Text style={footerCompany}>Göktaş Global Mühendislik</Text>
          <Text style={footerContact}>
            <Link href="mailto:info@goktasglobal.com" style={footerLink}>info@goktasglobal.com</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentOverdueReminderEmail,
  subject: (data: Record<string, any>) =>
    `⚠️ ${data.projectName || 'Proje'} Hakediş #${data.hakedisNo || '1'} ${data.daysOverdue || '30'} Gündür Ödenmedi`,
  displayName: 'Gecikmiş hakediş uyarısı (30+ gün)',
  previewData: {
    projectName: 'Akdeniz Residence',
    hakedisNo: '3',
    amount: '₺245.000,00',
    dueDate: '3 Mart 2025',
    daysOverdue: '30',
    interestAmount: '₺4.287,50',
    detailUrl: 'https://muhendisai.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const logoSection = { backgroundColor: '#0F1419', padding: '24px 30px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { fontSize: '28px', margin: '0', letterSpacing: '-0.5px' }
const contentSection = { padding: '30px 30px 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const alertBox = { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const alertLabel = { fontSize: '10px', color: '#94A3B8', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const alertValue = { fontSize: '15px', color: '#0F1419', fontWeight: 'bold' as const, margin: '2px 0 12px' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#FF6B2B', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '14px 32px', textDecoration: 'none' }
const warningText = { fontSize: '12px', color: '#92400E', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', padding: '10px 14px', margin: '16px 0 0' }
const hr = { borderColor: '#E2E8F0', margin: '0' }
const footerSection = { padding: '20px 30px', textAlign: 'center' as const }
const footerCompany = { fontSize: '13px', fontWeight: 'bold' as const, color: '#64748B', margin: '0 0 4px' }
const footerContact = { fontSize: '11px', color: '#94A3B8', margin: '0' }
const footerLink = { color: '#FF6B2B', textDecoration: 'none', fontSize: '11px' }
