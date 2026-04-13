/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

interface Props {
  projectName: string
  period: string
  netAmount: string
  result: string
  clientNote: string
  approvalDate: string
}

const HakedisApprovalResult: React.FC<Props> = ({
  projectName = 'Proje',
  period = 'Ocak 2026',
  netAmount = '₺0',
  result = 'onaylandi',
  clientNote = '',
  approvalDate = '',
}) => {
  const isApproved = result === 'onaylandi'
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", backgroundColor: '#0F1419', padding: '40px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#161C23', borderRadius: 16, overflow: 'hidden', border: '1px solid #1E2732' }}>
        <div style={{ backgroundColor: isApproved ? '#22C55E' : '#EF4444', padding: '24px 32px', textAlign: 'center' as const }}>
          <h1 style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700, margin: 0 }}>
            {isApproved ? '✅ Hakediş Onaylandı' : '❌ Hakedişe İtiraz Edildi'}
          </h1>
        </div>
        <div style={{ padding: '32px' }}>
          <div style={{ backgroundColor: '#0F1419', borderRadius: 12, padding: '20px', marginBottom: 24, border: '1px solid #1E2732' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <tbody>
                <tr><td style={{ color: '#64748B', fontSize: 13, padding: '6px 0' }}>Proje:</td><td style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'right' as const }}>{projectName}</td></tr>
                <tr><td style={{ color: '#64748B', fontSize: 13, padding: '6px 0' }}>Dönem:</td><td style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'right' as const }}>{period}</td></tr>
                <tr><td style={{ color: '#64748B', fontSize: 13, padding: '6px 0' }}>Net Tutar:</td><td style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'right' as const }}>{netAmount}</td></tr>
                <tr><td style={{ color: '#64748B', fontSize: 13, padding: '6px 0' }}>Tarih:</td><td style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'right' as const }}>{approvalDate}</td></tr>
              </tbody>
            </table>
          </div>
          {!isApproved && clientNote && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '16px', marginBottom: 24, border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ color: '#EF4444', fontSize: 12, fontWeight: 600, margin: '0 0 8px' }}>İtiraz Notu:</p>
              <p style={{ color: '#F1F5F9', fontSize: 13, lineHeight: '20px', margin: 0 }}>{clientNote}</p>
            </div>
          )}
          <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: '20px' }}>
            {isApproved
              ? 'Müşteriniz bu hakediş dönemini onaylamıştır. Ödeme sürecine devam edebilirsiniz.'
              : 'Müşteriniz bu hakediş dönemine itiraz etmiştir. Hakedişi düzenleyip tekrar onaya gönderebilirsiniz.'}
          </p>
        </div>
        <div style={{ backgroundColor: '#0F1419', padding: '16px 32px', textAlign: 'center' as const, borderTop: '1px solid #1E2732' }}>
          <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Şantiyem — Şantiyenizi Tek Panelden Yönetin</p>
        </div>
      </div>
    </div>
  )
}

export const template: TemplateEntry = {
  component: HakedisApprovalResult,
  subject: (data) => `${data.result === 'onaylandi' ? '✅ Hakediş Onaylandı' : '❌ Hakedişe İtiraz Edildi'} — ${data.projectName}`,
  displayName: 'Hakediş Onay Sonucu',
  previewData: {
    projectName: 'Merkez Kule İnşaatı',
    period: 'Ocak 2026',
    netAmount: '₺485.000',
    result: 'onaylandi',
    clientNote: '',
    approvalDate: '12 Nisan 2026',
  },
}
