import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!
const IYZICO_BASE_URL = 'https://api.iyzipay.com'

const PLAN_MAP: Record<string, string> = { pro: 'pro', team: 'team', enterprise: 'enterprise' }

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function generateAuthV2(uri: string, bodyJson: string): Promise<{ authorization: string; randomKey: string }> {
  const encoder = new TextEncoder()
  const randomKey = Date.now().toString() + '123456789'
  const payload = randomKey + uri + bodyJson
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(IYZICO_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload))
  const signature = toHex(sig)
  const authStr = `apiKey:${IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`
  const authorization = `IYZWSv2 ${btoa(authStr)}`
  return { authorization, randomKey }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const txnId = url.searchParams.get('txnId')
    if (!txnId) return new Response('Missing txnId', { status: 400 })

    let token = ''
    if (req.method === 'POST') {
      const formData = await req.formData()
      token = formData.get('token')?.toString() || ''
    }
    if (!token) return redirectWithStatus('failed', 'Token bulunamadi')

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const requestBody = { locale: 'tr', conversationId: txnId.substring(0, 20), token }
    const uri = '/payment/iyzipos/checkoutform/auth/ecom/detail'
    const bodyJson = JSON.stringify(requestBody)
    const { authorization, randomKey } = await generateAuthV2(uri, bodyJson)

    const iyzicoResponse = await fetch(`${IYZICO_BASE_URL}${uri}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authorization, 'x-iyzi-rnd': randomKey },
      body: bodyJson,
    })
    const iyzicoData = await iyzicoResponse.json()
    console.log('iyzico callback result:', iyzicoData.status, iyzicoData.paymentStatus)

    if (iyzicoData.status === 'success' && iyzicoData.paymentStatus === 'SUCCESS') {
      await supabaseAdmin.from('payment_transactions').update({
        status: 'success', iyzico_payment_id: iyzicoData.paymentId, iyzico_token: token, updated_at: new Date().toISOString(),
      }).eq('id', txnId)

      const { data: txn } = await supabaseAdmin.from('payment_transactions').select('user_id, plan_name').eq('id', txnId).single()
      if (txn) {
        await supabaseAdmin.from('profiles').update({ plan: PLAN_MAP[txn.plan_name] || txn.plan_name, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id)
      }
      return redirectWithStatus('success')
    } else {
      const errorMsg = iyzicoData.errorMessage || 'Odeme basarisiz'
      await supabaseAdmin.from('payment_transactions').update({
        status: 'failed', error_message: errorMsg, iyzico_token: token, updated_at: new Date().toISOString(),
      }).eq('id', txnId)
      return redirectWithStatus('failed', errorMsg)
    }
  } catch (err) {
    console.error('Callback error:', err)
    return redirectWithStatus('failed', 'Sunucu hatasi')
  }
})

function redirectWithStatus(status: string, message?: string): Response {
  const baseUrl = 'https://muhendis-ai.lovable.app'
  const params = new URLSearchParams({ status })
  if (message) params.set('message', message)
  return new Response(null, { status: 302, headers: { 'Location': `${baseUrl}/odeme-sonucu?${params.toString()}` } })
}
