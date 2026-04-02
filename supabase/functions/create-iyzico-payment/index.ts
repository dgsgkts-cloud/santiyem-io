import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!
const IYZICO_BASE_URL = 'https://api.iyzipay.com' // production

const PLAN_PRICES: Record<string, { price: number; name: string; planCode: string }> = {
  pro: { price: 399, name: 'Profesyonel Plan', planCode: 'pro' },
  team: { price: 1499, name: 'Ekip Planı', planCode: 'team' },
  enterprise: { price: 4999, name: 'Kurumsal Plan', planCode: 'enterprise' },
}

function generateHash(params: string[]): string {
  const encoder = new TextEncoder()
  const key = encoder.encode(IYZICO_SECRET_KEY)
  // Simple HMAC-like hash for iyzico PKI string
  return params.join('')
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

async function hmacSha256Base64(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { planKey, yearly } = body

    if (!planKey || !PLAN_PRICES[planKey]) {
      return new Response(JSON.stringify({ error: 'Geçersiz plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const planInfo = PLAN_PRICES[planKey]
    const monthlyPrice = planInfo.price
    const finalPrice = yearly ? Math.round(monthlyPrice * 0.8 * 12) : monthlyPrice
    const priceStr = finalPrice.toFixed(2)

    // Create a conversation token via iyzico checkout form init
    const conversationId = crypto.randomUUID().replace(/-/g, '').substring(0, 20)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Insert payment transaction
    const { data: txn, error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        plan_name: planKey,
        amount: finalPrice,
        status: 'pending',
      })
      .select('id')
      .single()

    if (txnError) {
      console.error('Transaction insert error:', txnError)
      return new Response(JSON.stringify({ error: 'İşlem oluşturulamadı' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const origin = req.headers.get('origin') || 'https://muhendis-ai.lovable.app'

    const requestBody: Record<string, unknown> = {
      locale: 'tr',
      conversationId: conversationId,
      price: priceStr,
      paidPrice: priceStr,
      currency: 'TRY',
      basketId: txn.id,
      paymentGroup: 'PRODUCT',
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/iyzico-callback?txnId=${txn.id}`,
      enabledInstallments: '[1]',
      buyer: {
        id: user.id.substring(0, 20),
        name: user.user_metadata?.full_name?.split(' ')[0] || 'Kullanıcı',
        surname: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'MühendisAI',
        gsmNumber: '+905000000000',
        email: user.email,
        identityNumber: '11111111111',
        registrationAddress: 'Türkiye',
        ip: req.headers.get('x-forwarded-for') || '85.0.0.1',
        city: 'Istanbul',
        country: 'Turkey',
      },
      billingAddress: {
        contactName: user.user_metadata?.full_name || 'Kullanıcı',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Türkiye',
      },
      shippingAddress: {
        contactName: user.user_metadata?.full_name || 'Kullanıcı',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Türkiye',
      },
      basketItems: [
        {
          id: planKey,
          name: planInfo.name,
          category1: 'Abonelik',
          itemType: 'VIRTUAL',
          price: priceStr,
        },
      ],
    }

    const authorization = await generateAuthorizationHeader(requestBody)

    const iyzicoResponse = await fetch(`${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': crypto.randomUUID(),
      },
      body: JSON.stringify(requestBody),
    })

    const iyzicoData = await iyzicoResponse.json()
    console.log('iyzico response status:', iyzicoData.status)

    if (iyzicoData.status === 'success' && iyzicoData.checkoutFormContent) {
      // Update transaction with token
      await supabaseAdmin
        .from('payment_transactions')
        .update({ iyzico_token: iyzicoData.token })
        .eq('id', txn.id)

      return new Response(JSON.stringify({
        checkoutFormContent: iyzicoData.checkoutFormContent,
        token: iyzicoData.token,
        transactionId: txn.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      console.error('iyzico error:', JSON.stringify(iyzicoData))
      await supabaseAdmin
        .from('payment_transactions')
        .update({ status: 'failed', error_message: iyzicoData.errorMessage || 'iyzico hatası' })
        .eq('id', txn.id)

      return new Response(JSON.stringify({
        error: iyzicoData.errorMessage || 'Ödeme formu oluşturulamadı',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
