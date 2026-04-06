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

async function refundPayment(paymentId: string, paymentTransactionId: string, price: string): Promise<boolean> {
  const requestBody = {
    locale: 'tr',
    paymentTransactionId,
    price,
    currency: 'TRY',
    ip: '85.0.0.1',
  }
  const uri = '/payment/refund'
  const bodyJson = JSON.stringify(requestBody)
  const { authorization, randomKey } = await generateAuthV2(uri, bodyJson)

  try {
    const resp = await fetch(`${IYZICO_BASE_URL}${uri}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authorization, 'x-iyzi-rnd': randomKey },
      body: bodyJson,
    })
    const data = await resp.json()
    console.log('Refund result:', data.status, data.errorMessage)
    return data.status === 'success'
  } catch (err) {
    console.error('Refund error:', err)
    return false
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const txnId = url.searchParams.get('txnId')
    const subId = url.searchParams.get('subId')
    const planAmount = url.searchParams.get('planAmount')
    if (!txnId || !subId) return new Response('Missing params', { status: 400 })

    let token = ''
    if (req.method === 'POST') {
      const formData = await req.formData()
      token = formData.get('token')?.toString() || ''
    }
    if (!token) return redirectWithStatus('failed', 'Token bulunamadi')

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Check payment result
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
    console.log('Trial callback result:', iyzicoData.status, iyzicoData.paymentStatus)
    console.log('Card storage info — cardUserKey:', iyzicoData.cardUserKey, 'cardToken:', iyzicoData.cardToken)

    if (iyzicoData.status === 'success' && iyzicoData.paymentStatus === 'SUCCESS') {
      // Extract card info for future charges
      const cardUserKey = iyzicoData.cardUserKey || null
      const cardToken = iyzicoData.cardToken || null
      const paymentId = iyzicoData.paymentId
      const paymentTransactionId = iyzicoData.itemTransactions?.[0]?.paymentTransactionId

      if (!cardUserKey || !cardToken) {
        console.warn('WARNING: Card storage info missing! cardUserKey:', cardUserKey, 'cardToken:', cardToken)
      }

      // Update payment transaction
      await supabaseAdmin.from('payment_transactions').update({
        status: 'success',
        iyzico_payment_id: paymentId,
        iyzico_token: token,
        updated_at: new Date().toISOString(),
      }).eq('id', txnId)

      // Immediately refund the 1 TRY validation charge — user pays nothing today
      if (paymentTransactionId) {
        const refunded = await refundPayment(paymentId, paymentTransactionId, '1.00')
        console.log('Validation refund:', refunded ? 'success' : 'failed')
      }

      // Activate trial subscription with saved card info
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const amount = planAmount ? parseInt(planAmount) : null
      
      const updateData: Record<string, any> = {
        status: 'trial',
        card_user_key: cardUserKey,
        card_token: cardToken,
        iyzico_payment_id: paymentId,
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
        next_payment_date: trialEnd.toISOString(),
        reminder_sent: false,
      }
      if (amount) updateData.amount = amount

      await supabaseAdmin.from('user_subscriptions').update(updateData).eq('id', subId)

      // Get subscription to find plan
      const { data: sub } = await supabaseAdmin.from('user_subscriptions')
        .select('plan_name, user_id')
        .eq('id', subId)
        .single()

      if (sub) {
        // Upgrade user plan immediately — full access for 14 days
        await supabaseAdmin.from('profiles').update({
          plan: PLAN_MAP[sub.plan_name] || sub.plan_name,
          updated_at: new Date().toISOString(),
        }).eq('user_id', sub.user_id)
      }

      return redirectWithStatus('success', 'Deneme süreniz başlatıldı! Kartınızdan herhangi bir ücret alınmadı. 14 gün boyunca tüm özellikleri ücretsiz kullanabilirsiniz.')
    } else {
      const errorMsg = iyzicoData.errorMessage || 'Kart dogrulama basarisiz'
      await supabaseAdmin.from('payment_transactions').update({
        status: 'failed', error_message: errorMsg, iyzico_token: token, updated_at: new Date().toISOString(),
      }).eq('id', txnId)
      await supabaseAdmin.from('user_subscriptions').update({ status: 'failed' }).eq('id', subId)
      return redirectWithStatus('failed', errorMsg)
    }
  } catch (err) {
    console.error('Trial callback error:', err)
    return redirectWithStatus('failed', 'Sunucu hatasi')
  }
})

function redirectWithStatus(status: string, message?: string): Response {
  const baseUrl = 'https://santiyem.lovable.app'
  const params = new URLSearchParams({ status })
  if (message) params.set('message', message)
  return new Response(null, { status: 302, headers: { 'Location': `${baseUrl}/odeme-sonucu?${params.toString()}` } })
}
