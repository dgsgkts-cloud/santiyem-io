/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>MühendisAI e-posta değişikliği onayı</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-posta Değişikliği Onayı</Heading>
        <Text style={text}>
          MühendisAI hesabınızda e-posta adresinizi{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>
          {' '}adresinden{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>
          {' '}adresine değiştirmek istediniz.
        </Text>
        <Text style={text}>
          Bu değişikliği onaylamak için aşağıdaki butona tıklayın:
        </Text>
        <Button style={button} href={confirmationUrl}>
          E-posta Değişikliğini Onayla
        </Button>
        <Text style={footer}>
          Bu değişikliği siz talep etmediyseniz hesabınızın güvenliğini kontrol edin.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0F1419',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#FF6B2B', textDecoration: 'underline' }
const button = {
  backgroundColor: '#FF6B2B',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
