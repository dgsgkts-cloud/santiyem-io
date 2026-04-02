import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { encode as base64Encode } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!
const IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com'

const PLAN_PRICES: Record<string, { price: number; name: string }> = {
  pro: { price: 399, name: 'Profesyonel Plan' },
  team: { price: 1499, name: 'Ekip Plani' },
  enterprise: { price: 4999, name: 'Kurumsal Plan' },
}

function toBase64(str: string): string {
  return base64Encode(new TextEncoder().encode(str))
}

async function sha256Base64(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return base64Encode(new Uint8Array(hash))
}

async function generateAuthorizationHeader(pki: string): Promise<string> {
  const randomString = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
  const hashStr = IYZICO_API_KEY + randomString + IYZICO_SECRET_KEY + pki
  const shaHash = await sha256Base64(hashStr)
  const authorizationParams = `apiKey:${IYZICO_API_KEY}&randomKey:${randomString}&signature:${shaHash}`
  return `IYZWS ${toBase64(authorizationParams)}`
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
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
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
    const monthlyPrice = planInfo.price
    const finalPrice = yearly ? Math.round(monthlyPrice * 0.8 * 12) : monthlyPrice
    const priceStr = finalPrice.toFixed(2)
    const conversationId = crypto.randomUUID().replace(/-/g, '').substring(0, 20)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: txn, error: txnError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({ user_id: user.id, plan_name: planKey, amount: finalPrice, status: 'pending' })
      .select('id')
      .single()

    if (txnError) {
      console.error('Transaction insert error:', txnError)
      return new Response(JSON.stringify({ error: 'Islem olusturulamadi' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buyerId = user.id.replace(/-/g, '').substring(0, 20)
    const fullName = (user.user_metadata?.full_name || 'Kullanici').replace(/[^\x00-\x7F]/g, '')
    const firstName = fullName.split(' ')[0] || 'User'
    const lastName = fullName.split(' ').slice(1).join(' ') || 'MuhendisAI'
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
        id: buyerId,
        name: firstName,
        surname: lastName,
        gsmNumber: '+905000000000',
        email: user.email,
        identityNumber: '11111111111',
        registrationAddress: 'Turkey',
        ip,
        city: 'Istanbul',
        country: 'Turkey',
      },
      billingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Turkey',
      },
      shippingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Turkey',
      },
      basketItems: [
        {
          id: planKey,
          name: planInfo.name,
          category1: 'Subscription',
          itemType: 'VIRTUAL',
          price: priceStr,
        },
      ],
    }

    // Build PKI string for authorization (flat representation)
    const pki = `[locale=tr,conversationId=${conversationId},price=${priceStr},paidPrice=${priceStr},currency=TRY,basketId=${txn.id},paymentGroup=PRODUCT,callbackUrl=${requestBody.callbackUrl},enabledInstallments=[1],buyer=[id=${buyerId},name=${firstName},surname=${lastName},gsmNumber=+905000000000,email=${user.email},identityNumber=11111111111,registrationAddress=Turkey,ip=${ip},city=Istanbul,country=Turkey],billingAddress=[contactName=${firstName} ${lastName},city=Istanbul,country=Turkey,address=Turkey],shippingAddress=[contactName=${firstName} ${lastName},city=Istanbul,country=Turkey,address=Turkey],basketItems=[[id=${planKey},name=${planInfo.name},category1=Subscription,itemType=VIRTUAL,price=${priceStr}]]]`

    const authorization = await generateAuthorizationHeader(pki)

    const iyzicoResponse = await fetch(`${IYZICO_BASE_URL}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify(requestBody),
    })

    const iyzicoData = await iyzicoResponse.json()
    console.log('iyzico response:', iyzicoData.status, iyzicoData.errorCode, iyzicoData.errorMessage)

    if (iyzicoData.status === 'success' && iyzicoData.checkoutFormContent) {
      await supabaseAdmin
        .from('payment_transactions')
        .update({ iyzico_token: iyzicoData.token })
        .eq('id', txn.id)

      return new Response(JSON.stringify({
        checkoutFormContent: iyzicoData.checkoutFormContent,
        token: iyzicoData.token,
        transactionId: txn.id,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      const errorMsg = iyzicoData.errorMessage || 'iyzico hatasi'
      console.error('iyzico error detail:', JSON.stringify(iyzicoData))
      await supabaseAdmin
        .from('payment_transactions')
        .update({ status: 'failed', error_message: errorMsg })
        .eq('id', txn.id)

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
