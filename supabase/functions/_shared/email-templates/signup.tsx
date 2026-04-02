/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => {
  const firstName = recipient.split('@')[0]

  return (
    <Html lang="tr" dir="ltr">
      <Head />
      <Preview>MühendisAI'ya Hoş Geldiniz! E-posta adresinizi doğrulayın</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>
              <span style={{ color: '#FF6B2B', fontWeight: 800 }}>Mühendis</span>
              <span style={{ color: '#F1F5F9', fontWeight: 800 }}>AI</span>
            </Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>Hoş Geldiniz! 🎉</Heading>

            <Text style={text}>
              Merhaba,
            </Text>

            <Text style={text}>
              <strong>MühendisAI</strong>'ya kayıt olduğunuz için teşekkürler.
              Türkiye'nin inşaat sektörüne özel yapay zeka asistanına artık erişebilirsiniz.
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightText}>
                🎁 <strong>14 günlük ücretsiz Pro denemeniz başladı!</strong>
              </Text>
              <Text style={highlightSubtext}>
                Hakediş yönetimi, proje takibi, AI asistan ve tüm Pro özelliklere sınırsız erişim.
              </Text>
            </Section>

            <Text style={text}>
              Hesabınızı aktif hale getirmek için e-posta adresinizi (
              <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
              ) doğrulamanız gerekiyor:
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={confirmationUrl}>
                E-posta Adresimi Doğrula
              </Button>
            </Section>

            <Text style={disclaimer}>
              Bu butonu siz talep etmediyseniz bu e-postayı görmezden gelebilirsiniz.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={footerCompany}>
              Göktaş Global Mühendislik
            </Text>
            <Text style={footerAddress}>
              Uluçınar Mah. 12 Özgürkent Sk. No:4, Arsuz/Hatay
            </Text>
            <Text style={footerContact}>
              <Link href="mailto:info@goktasglobal.com" style={footerLink}>info@goktasglobal.com</Link>
              {' · '}
              <Link href="tel:+905333771156" style={footerLink}>+90 533 377 11 56</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto' }
const logoSection = {
  backgroundColor: '#0F1419',
  padding: '24px 30px',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
}
const logoText = { fontSize: '28px', margin: '0', letterSpacing: '-0.5px' }
const contentSection = { padding: '30px 30px 20px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0F1419',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const highlightBox = {
  backgroundColor: '#FFF7ED',
  border: '1px solid #FFEDD5',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
}
const highlightText = {
  fontSize: '15px',
  color: '#0F1419',
  margin: '0 0 6px',
}
const highlightSubtext = {
  fontSize: '13px',
  color: '#64748B',
  margin: '0',
}
const link = { color: '#FF6B2B', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#FF6B2B',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 32px',
  textDecoration: 'none',
}
const disclaimer = {
  fontSize: '12px',
  color: '#94A3B8',
  margin: '16px 0 0',
  textAlign: 'center' as const,
}
const hr = { borderColor: '#E2E8F0', margin: '0' }
const footerSection = { padding: '20px 30px', textAlign: 'center' as const }
const footerCompany = { fontSize: '13px', fontWeight: 'bold' as const, color: '#64748B', margin: '0 0 4px' }
const footerAddress = { fontSize: '11px', color: '#94A3B8', margin: '0 0 4px' }
const footerContact = { fontSize: '11px', color: '#94A3B8', margin: '0' }
const footerLink = { color: '#FF6B2B', textDecoration: 'none', fontSize: '11px' }
