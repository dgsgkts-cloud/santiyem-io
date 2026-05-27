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
    const isNative = url.searchParams.get('native') === '1'
    if (!txnId) return new Response('Missing txnId', { status: 400 })

    let token = ''
    if (req.method === 'POST') {
      const formData = await req.formData()
      token = formData.get('token')?.toString() || ''
    }
    if (!token) return redirectWithStatus('failed', 'Token bulunamadi', isNative)

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
      const cardUserKey = iyzicoData.cardUserKey || null
      const cardToken = iyzicoData.cardToken || null
      console.log('Direct payment card info — cardUserKey:', cardUserKey ? 'EXISTS' : 'MISSING')

      await supabaseAdmin.from('payment_transactions').update({
        status: 'success', iyzico_payment_id: iyzicoData.paymentId, iyzico_token: token, updated_at: new Date().toISOString(),
      }).eq('id', txnId)

      const { data: txn } = await supabaseAdmin.from('payment_transactions').select('user_id, plan_name, amount').eq('id', txnId).single()
      if (txn) {
        await supabaseAdmin.from('profiles').update({ plan: PLAN_MAP[txn.plan_name] || txn.plan_name, updated_at: new Date().toISOString() }).eq('user_id', txn.user_id)

        // Determine subscription type from URL params
        const subType = url.searchParams.get('subType') || 'monthly'
        const nextPayment = subType === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        // Save card info and create/update subscription for recurring billing
        if (cardUserKey && cardToken) {
          const subData: any = {
            user_id: txn.user_id,
            plan_name: txn.plan_name,
            status: 'active',
            subscription_type: subType,
            card_user_key: cardUserKey,
            card_token: cardToken,
            iyzico_payment_id: iyzicoData.paymentId,
            amount: iyzicoData.paidPrice ? parseFloat(iyzicoData.paidPrice) : (txn.amount || 0),
            trial_start: new Date().toISOString(),
            trial_end: new Date().toISOString(),
            next_payment_date: nextPayment.toISOString(),
            last_payment_date: new Date().toISOString(),
          }
          const { data: upsertedSub } = await supabaseAdmin.from('user_subscriptions')
            .upsert(subData, { onConflict: 'user_id,plan_name' }).select('id').single()

          // Save card to user_cards table
          const cardAssociation = iyzicoData.cardAssociation || 'UNKNOWN'
          const cardType = iyzicoData.cardType || 'UNKNOWN'
          const binNumber = iyzicoData.binNumber || ''
          const lastFour = iyzicoData.lastFourDigits || binNumber?.slice(-4) || '****'

          // Check if card already exists
          const { data: existingCard } = await supabaseAdmin.from('user_cards')
            .select('id').eq('user_id', txn.user_id).eq('card_token', cardToken).maybeSingle()

          if (!existingCard) {
            // Check if user has any cards — if not, make this default
            const { count: cardCount } = await supabaseAdmin.from('user_cards')
              .select('id', { count: 'exact', head: true }).eq('user_id', txn.user_id)

            await supabaseAdmin.from('user_cards').insert({
              user_id: txn.user_id,
              card_user_key: cardUserKey,
              card_token: cardToken,
              card_alias: `**** **** **** ${lastFour}`,
              card_type: cardType,
              card_association: cardAssociation,
              bin_number: binNumber,
              last_four_digits: lastFour,
              is_default: (cardCount || 0) === 0,
            })
          }

          // Create invoice
          await supabaseAdmin.from('invoices').insert({
            user_id: txn.user_id,
            subscription_id: upsertedSub?.id || null,
            plan_name: txn.plan_name,
            amount: iyzicoData.paidPrice ? parseFloat(iyzicoData.paidPrice) : (txn.amount || 0),
            iyzico_payment_id: iyzicoData.paymentId,
            status: 'paid',
          })
        }
      }
      return redirectWithStatus('success', undefined, isNative)
    } else {
      const errorMsg = iyzicoData.errorMessage || 'Odeme basarisiz'
      // iyzico iptal sinyalleri: paymentStatus=CALLBACK_THREEDS / CANCELED,
      // errorCode 10051 (kullanıcı vazgeçti) → canceled olarak işaretle
      const isCanceled =
        iyzicoData.paymentStatus === 'CANCELED' ||
        iyzicoData.errorCode === '10051' ||
        /iptal|cancel/i.test(errorMsg)
      const finalStatus = isCanceled ? 'canceled' : 'failed'

      await supabaseAdmin.from('payment_transactions').update({
        status: finalStatus, error_message: errorMsg, iyzico_token: token, updated_at: new Date().toISOString(),
      }).eq('id', txnId)
      return redirectWithStatus(finalStatus, errorMsg, isNative)
    }
  } catch (err) {
    console.error('Callback error:', err)
    return redirectWithStatus('failed', 'Sunucu hatasi')
  }
})

function redirectWithStatus(status: string, message?: string, native = false): Response {
  const params = new URLSearchParams({ status })
  if (message) params.set('message', message)
  if (native) params.set('native', '1')
  // iyzico Back URL chain: edge function → https://santiyem.io/payment-callback
  // Bridge page native flag varsa santiyem://payment-callback deep link'ine atar.
  const location = `https://santiyem.io/payment-callback?${params.toString()}`
  return new Response(null, { status: 302, headers: { 'Location': location } })
}
