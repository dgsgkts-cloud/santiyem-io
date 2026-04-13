/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'

interface Props {
  projectName: string
  period: string
  netAmount: string
  approvalUrl: string
  senderName: string
}

const HakedisApprovalRequest: React.FC<Props> = ({
  projectName = 'Proje',
  period = 'Ocak 2026',
  netAmount = '₺0',
  approvalUrl = '#',
  senderName = 'Şantiyem',
}) => (
  <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", backgroundColor: '#0F1419', padding: '40px 20px' }}>
    <div style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#161C23', borderRadius: 16, overflow: 'hidden', border: '1px solid #1E2732' }}>
      <div style={{ backgroundColor: '#FF6B2B', padding: '24px 32px', textAlign: 'center' as const }}>
        <h1 style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700, margin: 0 }}>Hakediş Onay Talebi</h1>
      </div>
      <div style={{ padding: '32px' }}>
        <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: '22px', margin: '0 0 24px' }}>
          Sayın Yetkili,<br /><br />
          <strong style={{ color: '#F1F5F9' }}>{senderName}</strong> tarafından aşağıdaki hakediş onayınıza sunulmuştur:
        </p>
        <div style={{ backgroundColor: '#0F1419', borderRadius: 12, padding: '20px', marginBottom: 24, border: '1px solid #1E2732' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <tbody>
              <tr><td style={{ color: '#64748B', fontSize: 13, padding: '6px 0' }}>Proje:</td><td style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'right' as const }}>{projectName}</td></tr>
              <tr><td style={{ color: '#64748B', fontSize: 13, padding: '6px 0' }}>Dönem:</td><td style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'right' as const }}>{period}</td></tr>
              <tr style={{ borderTop: '1px solid #1E2732' }}><td style={{ color: '#64748B', fontSize: 13, padding: '10px 0 0' }}>Net Tutar:</td><td style={{ color: '#22C55E', fontSize: 16, fontWeight: 700, textAlign: 'right' as const, paddingTop: 10 }}>{netAmount}</td></tr>
            </tbody>
          </table>
        </div>
        <a href={approvalUrl} style={{ display: 'block', backgroundColor: '#FF6B2B', color: '#FFFFFF', textDecoration: 'none', textAlign: 'center' as const, padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600 }}>
          Hakediş Detayını Görüntüle
        </a>
        <p style={{ color: '#475569', fontSize: 12, textAlign: 'center' as const, marginTop: 16 }}>
          Bu link 30 gün süreyle geçerlidir.
        </p>
      </div>
      <div style={{ backgroundColor: '#0F1419', padding: '16px 32px', textAlign: 'center' as const, borderTop: '1px solid #1E2732' }}>
        <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Şantiyem — Şantiyenizi Tek Panelden Yönetin</p>
      </div>
    </div>
  </div>
)

export const template: TemplateEntry = {
  component: HakedisApprovalRequest,
  subject: (data) => `Hakediş Onay Talebi — ${data.projectName} (${data.period})`,
  displayName: 'Hakediş Onay Talebi',
  previewData: {
    projectName: 'Merkez Kule İnşaatı',
    period: 'Ocak 2026',
    netAmount: '₺485.000',
    approvalUrl: 'https://santiyem.io/hakedis-onay/abc123',
    senderName: 'ABC İnşaat A.Ş.',
  },
}
