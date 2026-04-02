/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WeeklySummaryProps {
  userName?: string
  completedTasks?: string
  overdueHakedis?: string
  expectedPayments?: string
  activeProjects?: Array<{ name: string; progress: string; status: string }>
  summaryUrl?: string
}

const WeeklySummaryEmail = ({
  userName = 'Mühendis',
  completedTasks = '0',
  overdueHakedis = '0',
  expectedPayments = '₺0',
  activeProjects = [],
  summaryUrl = '#',
}: WeeklySummaryProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Şantiyem — Haftalık Özet</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>
            <span style={{ color: '#FF6B2B', fontWeight: 800 }}>Şantiyem</span>
          </Text>
          <Text style={logoSubtext}>Şantiyenizi Tek Panelden Yönetin</Text>
        </Section>

        <Section style={contentSection}>
          <Heading style={h1}>📊 Haftalık Özet</Heading>

          <Text style={text}>Merhaba {userName},</Text>
          <Text style={text}>Bu haftanın özeti aşağıda:</Text>

          <Section style={statsGrid}>
            <Section style={statCard}>
              <Text style={statNumber}>{completedTasks}</Text>
              <Text style={statLabel}>Tamamlanan İş</Text>
            </Section>
            <Section style={statCardWarning}>
              <Text style={{ ...statNumber, color: parseInt(overdueHakedis) > 0 ? '#EF4444' : '#0F1419' }}>
                {overdueHakedis}
              </Text>
              <Text style={statLabel}>Geciken Hakediş</Text>
            </Section>
            <Section style={statCard}>
              <Text style={{ ...statNumber, color: '#FF6B2B' }}>{expectedPayments}</Text>
              <Text style={statLabel}>Beklenen Ödeme</Text>
            </Section>
          </Section>

          {activeProjects.length > 0 && (
            <>
              <Heading style={h2}>Aktif Projeler</Heading>
              <Section style={projectList}>
                {activeProjects.map((p, i) => (
                  <Section key={i} style={projectRow}>
                    <Text style={projectName}>{p.name}</Text>
                    <Text style={projectDetail}>
                      İlerleme: {p.progress} · Durum: {p.status}
                    </Text>
                  </Section>
                ))}
              </Section>
            </>
          )}

          <Section style={buttonSection}>
            <Link href={summaryUrl} style={buttonLink}>
              Dashboard'a Git →
            </Link>
          </Section>
        </Section>

        <Hr style={hr} />
        <Section style={footerSection}>
          <Text style={footerCompany}>Göktaş Global Mühendislik</Text>
          <Text style={footerNote}>
            Bu e-postayı almak istemiyorsanız Ayarlar → Bildirimler'den kapatabilirsiniz.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WeeklySummaryEmail,
  subject: 'Şantiyem — Haftalık Özet',
  displayName: 'Haftalık özet',
  previewData: {
    userName: 'Doğuş',
    completedTasks: '12',
    overdueHakedis: '2',
    expectedPayments: '₺385.000',
    activeProjects: [
      { name: 'Akdeniz Residence', progress: '%67', status: 'Devam Ediyor' },
      { name: 'AVM İnşaatı', progress: '%42', status: 'Gecikmiş' },
    ],
    summaryUrl: 'https://santiyem.io',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const logoSection = { backgroundColor: '#0F1419', padding: '24px 30px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { fontSize: '28px', margin: '0', letterSpacing: '-0.5px' }
const contentSection = { padding: '30px 30px 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0 0 20px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0F1419', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const statsGrid = { margin: '20px 0' }
const statCard = { backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', textAlign: 'center' as const }
const statCardWarning = { ...statCard }
const statNumber = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0' }
const statLabel = { fontSize: '11px', color: '#94A3B8', margin: '4px 0 0', textTransform: 'uppercase' as const }
const projectList = { margin: '0 0 20px' }
const projectRow = { padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', marginBottom: '6px' }
const projectName = { fontSize: '14px', fontWeight: 'bold' as const, color: '#0F1419', margin: '0' }
const projectDetail = { fontSize: '12px', color: '#64748B', margin: '4px 0 0' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const buttonLink = { backgroundColor: '#FF6B2B', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' as const }
const hr = { borderColor: '#E2E8F0', margin: '0' }
const footerSection = { padding: '20px 30px', textAlign: 'center' as const }
const footerCompany = { fontSize: '13px', fontWeight: 'bold' as const, color: '#64748B', margin: '0 0 4px' }
const footerNote = { fontSize: '11px', color: '#94A3B8', margin: '0' }
