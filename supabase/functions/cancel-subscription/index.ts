import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IYZICO_API_KEY = Deno.env.get('IYZICO_API_KEY')!
const IYZICO_SECRET_KEY = Deno.env.get('IYZICO_SECRET_KEY')!
const IYZICO_BASE_URL = 'https://api.iyzipay.com'

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

async function deleteStoredCard(cardUserKey: string, cardToken: string): Promise<boolean> {
  const requestBody = {
    locale: 'tr',
    cardUserKey,
    cardToken,
  }
  const uri = '/cardstorage/card'
  const bodyJson = JSON.stringify(requestBody)
  const { authorization, randomKey } = await generateAuthV2(uri, bodyJson)

  try {
    const resp = await fetch(`${IYZICO_BASE_URL}${uri}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': authorization, 'x-iyzi-rnd': randomKey },
      body: bodyJson,
    })
    const data = await resp.json()
    console.log('Delete card result:', data.status, data.errorMessage)
    return data.status === 'success'
  } catch (err) {
    console.error('Delete card error:', err)
    return false
  }
}

const PLAN_NAMES: Record<string, string> = {
  pro: 'Profesyonel',
  team: 'Ekip',
  enterprise: 'Kurumsal',
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
    const { reason } = body

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Find active subscription
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['trial', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!sub) {
      return new Response(JSON.stringify({ error: 'Aktif abonelik bulunamadi' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete stored card from iyzico
    if (sub.card_user_key && sub.card_token) {
      const deleted = await deleteStoredCard(sub.card_user_key, sub.card_token)
      console.log('Card deletion:', deleted ? 'success' : 'failed/skipped')
    }

    // Determine access end date
    const accessEndDate = sub.status === 'trial'
      ? sub.trial_end
      : sub.next_payment_date

    // Update subscription status
    await supabaseAdmin.from('user_subscriptions').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      card_user_key: null,
      card_token: null,
    }).eq('id', sub.id)

    // Send cancellation email
    try {
      const planName = PLAN_NAMES[sub.plan_name] || sub.plan_name
      const endDate = new Date(accessEndDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

      await supabaseAdmin.functions.invoke('send-transactional-email', {
        body: {
          purpose: 'transactional',
          idempotency_key: `cancel-${sub.id}-${Date.now()}`,
          template_name: 'payment_due_reminder',
          to: user.email,
          subject: 'Aboneliğiniz İptal Edildi',
          template_data: {
            recipientName: user.user_metadata?.full_name || 'Değerli Kullanıcı',
            paymentAmount: `${planName} Plan`,
            dueDate: endDate,
            projectName: `Erişiminiz ${endDate} tarihine kadar devam edecek.`,
          },
        },
      })
    } catch (emailErr) {
      console.error('Cancel email error:', emailErr)
    }

    return new Response(JSON.stringify({
      ok: true,
      accessEndDate,
      message: 'Aboneliginiz iptal edildi',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Cancel subscription error:', err)
    return new Response(JSON.stringify({ error: 'Sunucu hatasi' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
