/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>MühendisAI'a davet edildiniz</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ekibe Davet Edildiniz</Heading>
        <Text style={text}>
          MühendisAI ekibine davet edildiniz. Daveti kabul edip hesabınızı
          oluşturmak için aşağıdaki butona tıklayın.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Daveti Kabul Et
        </Button>
        <Text style={footer}>
          Bu daveti beklemiyorsanız bu e-postayı görmezden gelebilirsiniz.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
const button = {
  backgroundColor: '#FF6B2B',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
