import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!
const IYZICO_BASE_URL = 'https://api.iyzipay.com'

const PLAN_MAP: Record<string, string> = {
  pro: 'pro',
  team: 'team',
  enterprise: 'enterprise',
}

function generatePKIString(obj: Record<string, unknown>): string {
  let pki = '['
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      pki += `${key}=${value},`
    }
  }
  pki = pki.replace(/,$/, '')
  pki += ']'
  return pki
}

async function sha256Base64(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

async function generateAuthorizationHeader(request: Record<string, unknown>): Promise<string> {
  const pki = generatePKIString(request)
  const randomString = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
  const hashStr = IYZICO_API_KEY + randomString + IYZICO_SECRET_KEY + pki
  const shaHash = await sha256Base64(hashStr)
  const authorizationParams = `apiKey:${IYZICO_API_KEY}&randomKey:${randomString}&signature:${shaHash}`
  const base64 = btoa(authorizationParams)
  return `IYZWS ${base64}`
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const txnId = url.searchParams.get('txnId')

    if (!txnId) {
      return new Response('Missing txnId', { status: 400 })
    }

    // Parse form data from iyzico callback (POST with form-urlencoded)
    let token = ''
    if (req.method === 'POST') {
      const formData = await req.formData()
      token = formData.get('token')?.toString() || ''
    }

    if (!token) {
      return redirectWithStatus('failed', 'Token bulunamadı')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Retrieve payment result from iyzico
    const requestBody: Record<string, unknown> = {
      locale: 'tr',
      conversationId: txnId.substring(0, 20),
      token: token,
    }

    const authorization = await generateAuthorizationHeader(requestBody)

    const iyzicoResponse = await fetch(`${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify(requestBody),
    })

    const iyzicoData = await iyzicoResponse.json()
    console.log('iyzico callback result:', iyzicoData.status, iyzicoData.paymentStatus)

    if (iyzicoData.status === 'success' && iyzicoData.paymentStatus === 'SUCCESS') {
      // Payment successful - update transaction
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'success',
          iyzico_payment_id: iyzicoData.paymentId,
          iyzico_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', txnId)

      // Get transaction to find user and plan
      const { data: txn } = await supabaseAdmin
        .from('payment_transactions')
        .select('user_id, plan_name')
        .eq('id', txnId)
        .single()

      if (txn) {
        // Update user plan
        const planCode = PLAN_MAP[txn.plan_name] || txn.plan_name
        await supabaseAdmin
          .from('profiles')
          .update({ plan: planCode, updated_at: new Date().toISOString() })
          .eq('user_id', txn.user_id)

        console.log(`Plan updated to ${planCode} for user ${txn.user_id}`)
      }

      return redirectWithStatus('success')
    } else {
      // Payment failed
      const errorMsg = iyzicoData.errorMessage || 'Ödeme başarısız'
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'failed',
          error_message: errorMsg,
          iyzico_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', txnId)

      return redirectWithStatus('failed', errorMsg)
    }
  } catch (err) {
    console.error('Callback error:', err)
    return redirectWithStatus('failed', 'Sunucu hatası')
  }
})

function redirectWithStatus(status: string, message?: string): Response {
  const baseUrl = 'https://muhendis-ai.lovable.app'
  const params = new URLSearchParams({ status })
  if (message) params.set('message', message)
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${baseUrl}/odeme-sonucu?${params.toString()}`,
    },
  })
}
