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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action } = body

    // LIST CARDS
    if (action === 'list') {
      const { data: cards } = await supabaseAdmin
        .from('user_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      return new Response(JSON.stringify({ cards: cards || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // DELETE CARD
    if (action === 'delete') {
      const { cardId } = body
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'cardId gerekli' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Get the card
      const { data: card } = await supabaseAdmin
        .from('user_cards')
        .select('*')
        .eq('id', cardId)
        .eq('user_id', user.id)
        .single()

      if (!card) {
        return new Response(JSON.stringify({ error: 'Kart bulunamadı' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Check if user has active subscription
      const { data: activeSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['trial', 'active'])
        .limit(1)
        .maybeSingle()

      if (activeSub) {
        // Count remaining cards
        const { count } = await supabaseAdmin
          .from('user_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if ((count || 0) <= 1) {
          return new Response(JSON.stringify({ 
            error: 'Aboneliğiniz devam ettiği sürece en az 1 kayıtlı kart bulunmalıdır. Kartı silmek için önce yeni kart ekleyin veya aboneliği iptal edin.' 
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Call iyzico deleteCard API
      const deleteBody = {
        locale: 'tr',
        conversationId: cardId.substring(0, 20),
        cardUserKey: card.card_user_key,
        cardToken: card.card_token,
      }
      const uri = '/cardstorage/card'
      const bodyJson = JSON.stringify(deleteBody)
      const { authorization, randomKey } = await generateAuthV2(uri, bodyJson)

      const iyzicoResp = await fetch(`${IYZICO_BASE_URL}${uri}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': authorization, 'x-iyzi-rnd': randomKey },
        body: bodyJson,
      })
      const iyzicoData = await iyzicoResp.json()
      console.log('iyzico deleteCard result:', iyzicoData.status)

      // Delete from DB regardless (card may already be removed from iyzico)
      await supabaseAdmin.from('user_cards').delete().eq('id', cardId)

      // If deleted card was default and there are other cards, make another default
      if (card.is_default) {
        const { data: remaining } = await supabaseAdmin
          .from('user_cards')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (remaining) {
          await supabaseAdmin.from('user_cards').update({ is_default: true }).eq('id', remaining.id)
          // Update subscription card token
          await supabaseAdmin.from('user_subscriptions')
            .update({ card_token: remaining.id })
            .eq('user_id', user.id)
            .in('status', ['trial', 'active'])
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // SET DEFAULT CARD
    if (action === 'setDefault') {
      const { cardId } = body
      if (!cardId) {
        return new Response(JSON.stringify({ error: 'cardId gerekli' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Remove default from all user cards
      await supabaseAdmin.from('user_cards').update({ is_default: false }).eq('user_id', user.id)

      // Set new default
      const { data: card } = await supabaseAdmin
        .from('user_cards')
        .update({ is_default: true })
        .eq('id', cardId)
        .eq('user_id', user.id)
        .select('card_user_key, card_token')
        .single()

      if (card) {
        // Update subscription with new default card
        await supabaseAdmin.from('user_subscriptions')
          .update({ card_user_key: card.card_user_key, card_token: card.card_token })
          .eq('user_id', user.id)
          .in('status', ['trial', 'active'])
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Geçersiz action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('manage-cards error:', err)
    return new Response(JSON.stringify({ error: 'Sunucu hatası' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
