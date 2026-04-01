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
}: SignupEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>MühendisAI hesabınızı doğrulayın</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-posta Doğrulama</Heading>
        <Text style={text}>
          <strong>MühendisAI</strong> platformuna hoş geldiniz! Hesabınızı aktif hale getirmek için
          e-posta adresinizi (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) doğrulamanız gerekiyor.
        </Text>
        <Button style={button} href={confirmationUrl}>
          E-postamı Doğrula
        </Button>
        <Text style={footer}>
          Bu hesabı siz oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
