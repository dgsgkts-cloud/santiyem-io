import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!
const IYZICO_BASE_URL = 'https://api.iyzipay.com'

const PLAN_PRICES: Record<string, { price: number; name: string }> = {
  pro: { price: 499, name: 'Profesyonel Plan' },
  team: { price: 1499, name: 'Ekip Plani' },
  enterprise: { price: 4999, name: 'Kurumsal Plan' },
}

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { planKey, yearly } = body
    if (!planKey || !PLAN_PRICES[planKey]) {
      return new Response(JSON.stringify({ error: 'Gecersiz plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const planInfo = PLAN_PRICES[planKey]
    const finalPrice = yearly ? Math.round(planInfo.price * 0.8 * 12) : planInfo.price
    const priceStr = finalPrice.toFixed(2)
    const conversationId = crypto.randomUUID().replace(/-/g, '').substring(0, 20)

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: txn, error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({ user_id: user.id, plan_name: planKey, amount: finalPrice, status: 'pending' })
      .select('id').single()

    if (txnError) {
      console.error('Transaction insert error:', txnError)
      return new Response(JSON.stringify({ error: 'Islem olusturulamadi' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buyerId = user.id.replace(/-/g, '').substring(0, 20)
    const fullName = (user.user_metadata?.full_name || 'User').replace(/[^\x00-\x7F]/g, 'x')
    const firstName = fullName.split(' ')[0] || 'User'
    const lastName = fullName.split(' ').slice(1).join(' ') || 'App'
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '85.0.0.1'

    const requestBody = {
      locale: 'tr',
      conversationId,
      price: priceStr,
      paidPrice: priceStr,
      currency: 'TRY',
      basketId: txn.id,
      paymentGroup: 'PRODUCT',
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/iyzico-callback?txnId=${txn.id}`,
      enabledInstallments: [1],
      buyer: {
        id: buyerId, name: firstName, surname: lastName,
        gsmNumber: '+905000000000', email: user.email,
        identityNumber: '11111111111', registrationAddress: 'Turkey',
        ip, city: 'Istanbul', country: 'Turkey',
      },
      billingAddress: { contactName: `${firstName} ${lastName}`, city: 'Istanbul', country: 'Turkey', address: 'Turkey' },
      shippingAddress: { contactName: `${firstName} ${lastName}`, city: 'Istanbul', country: 'Turkey', address: 'Turkey' },
      basketItems: [{ id: planKey, name: planInfo.name, category1: 'Subscription', itemType: 'VIRTUAL', price: priceStr }],
    }

    const uri = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
    const bodyJson = JSON.stringify(requestBody)
    const authorization = await generateAuthV2(uri, bodyJson)

    const iyzicoResponse = await fetch(`${IYZICO_BASE_URL}${uri}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authorization },
      body: bodyJson,
    })

    const iyzicoData = await iyzicoResponse.json()
    console.log('iyzico response:', iyzicoData.status, iyzicoData.errorCode, iyzicoData.errorMessage)

    if (iyzicoData.status === 'success' && iyzicoData.checkoutFormContent) {
      await supabaseAdmin.from('payment_transactions').update({ iyzico_token: iyzicoData.token }).eq('id', txn.id)
      return new Response(JSON.stringify({
        checkoutFormContent: iyzicoData.checkoutFormContent, token: iyzicoData.token, transactionId: txn.id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      const errorMsg = iyzicoData.errorMessage || 'iyzico hatasi'
      console.error('iyzico error:', JSON.stringify(iyzicoData))
      await supabaseAdmin.from('payment_transactions').update({ status: 'failed', error_message: errorMsg }).eq('id', txn.id)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Sunucu hatasi' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
