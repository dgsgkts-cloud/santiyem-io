import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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

const PLAN_PRICES: Record<string, number> = { pro: 499, team: 1499, enterprise: 4999 }
const PLAN_NAMES: Record<string, string> = { pro: 'Profesyonel', team: 'Ekip', enterprise: 'Kurumsal' }

async function chargeStoredCard(sub: any, supabaseAdmin: any): Promise<boolean> {
  if (!sub.card_user_key || !sub.card_token) {
    console.log(`No card info for subscription ${sub.id}`)
    return false
  }

  const price = (sub.amount || PLAN_PRICES[sub.plan_name] || 499).toFixed(2)
  const conversationId = crypto.randomUUID().replace(/-/g, '').substring(0, 20)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('user_id', sub.user_id)
    .single()

  const fullName = (profile?.full_name || 'User').replace(/[^\x00-\x7F]/g, 'x')
  const firstName = fullName.split(' ')[0] || 'User'
  const lastName = fullName.split(' ').slice(1).join(' ') || 'App'
  const buyerId = sub.user_id.replace(/-/g, '').substring(0, 20)

  // Get user email
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
  const userEmail = authUser?.user?.email || 'user@santiyem.io'
  const userName = authUser?.user?.user_metadata?.full_name || 'Değerli Kullanıcı'

  const requestBody = {
    locale: 'tr',
    conversationId,
    price,
    paidPrice: price,
    currency: 'TRY',
    installment: 1,
    basketId: sub.id,
    paymentChannel: 'WEB',
    paymentGroup: 'PRODUCT',
    paymentCard: {
      cardUserKey: sub.card_user_key,
      cardToken: sub.card_token,
    },
    buyer: {
      id: buyerId, name: firstName, surname: lastName,
      gsmNumber: '+905000000000', email: userEmail,
      identityNumber: '11111111111', registrationAddress: 'Turkey',
      ip: '85.0.0.1', city: 'Istanbul', country: 'Turkey',
    },
    billingAddress: { contactName: `${firstName} ${lastName}`, city: 'Istanbul', country: 'Turkey', address: 'Turkey' },
    shippingAddress: { contactName: `${firstName} ${lastName}`, city: 'Istanbul', country: 'Turkey', address: 'Turkey' },
    basketItems: [{ id: sub.plan_name, name: `${PLAN_NAMES[sub.plan_name] || sub.plan_name} Plan`, category1: 'Subscription', itemType: 'VIRTUAL', price }],
  }

  const uri = '/payment/auth'
  const bodyJson = JSON.stringify(requestBody)
  const { authorization, randomKey } = await generateAuthV2(uri, bodyJson)

  try {
    const resp = await fetch(`${IYZICO_BASE_URL}${uri}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authorization, 'x-iyzi-rnd': randomKey },
      body: bodyJson,
    })
    const data = await resp.json()
    console.log(`Payment for sub ${sub.id}:`, data.status, data.errorMessage)

    if (data.status === 'success') {
      await supabaseAdmin.from('payment_transactions').insert({
        user_id: sub.user_id,
        plan_name: sub.plan_name,
        amount: parseFloat(price),
        status: 'success',
        iyzico_payment_id: data.paymentId,
      })

      const nextPayment = new Date()
      nextPayment.setMonth(nextPayment.getMonth() + 1)
      await supabaseAdmin.from('user_subscriptions').update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextPayment.toISOString(),
        reminder_sent: false,
      }).eq('id', sub.id)

      return true
    } else {
      console.error(`Payment failed for sub ${sub.id}:`, data.errorMessage)

      // Send failed payment email
      try {
        await supabaseAdmin.functions.invoke('send-transactional-email', {
          body: {
            purpose: 'transactional',
            idempotency_key: `payment-failed-${sub.id}-${Date.now()}`,
            template_name: 'payment_overdue_reminder',
            to: userEmail,
            subject: 'Ödemeniz Alınamadı — Kartınızı Güncelleyin',
            template_data: {
              recipientName: userName,
              paymentAmount: `₺${parseFloat(price).toLocaleString('tr-TR')}`,
              dueDate: new Date().toLocaleDateString('tr-TR'),
              projectName: `${PLAN_NAMES[sub.plan_name] || sub.plan_name} Plan`,
            },
          },
        })
      } catch (emailErr) {
        console.error(`Failed payment email error:`, emailErr)
      }

      // Downgrade user
      await supabaseAdmin.from('user_subscriptions').update({ status: 'expired' }).eq('id', sub.id)
      await supabaseAdmin.from('profiles').update({ plan: 'free' }).eq('user_id', sub.user_id)
      return false
    }
  } catch (err) {
    console.error(`Charge error for sub ${sub.id}:`, err)
    return false
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 1. Send reminder emails for trials ending tomorrow (13th day)
    const { data: trialEndingSoon } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'trial')
      .eq('reminder_sent', false)
      .lte('trial_end', tomorrow.toISOString())
      .gt('trial_end', now.toISOString())

    if (trialEndingSoon && trialEndingSoon.length > 0) {
      for (const sub of trialEndingSoon) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
          if (authUser?.user?.email) {
            const amount = sub.amount || PLAN_PRICES[sub.plan_name] || 499
            const planName = PLAN_NAMES[sub.plan_name] || sub.plan_name
            await supabaseAdmin.functions.invoke('send-transactional-email', {
              body: {
                purpose: 'transactional',
                idempotency_key: `trial-reminder-${sub.id}`,
                template_name: 'payment_due_reminder',
                to: authUser.user.email,
                subject: `Deneme Süreniz Yarın Sona Eriyor — ₺${amount} Tahsil Edilecek`,
                template_data: {
                  recipientName: authUser.user.user_metadata?.full_name || 'Değerli Kullanıcı',
                  paymentAmount: `₺${amount.toLocaleString('tr-TR')}`,
                  dueDate: new Date(sub.trial_end).toLocaleDateString('tr-TR'),
                  projectName: `${planName} Plan — 14 günlük denemeniz yarın sona eriyor, kayıtlı kartınızdan ₺${amount} tahsil edilecek.`,
                },
              },
            })
          }
        } catch (emailErr) {
          console.error(`Reminder email error for sub ${sub.id}:`, emailErr)
        }
        await supabaseAdmin.from('user_subscriptions').update({ reminder_sent: true }).eq('id', sub.id)
      }
    }

    // 2. Process expired trials — charge the card (14th day)
    const { data: expiredTrials } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'trial')
      .lte('trial_end', now.toISOString())

    if (expiredTrials && expiredTrials.length > 0) {
      for (const sub of expiredTrials) {
        await chargeStoredCard(sub, supabaseAdmin)
      }
    }

    // 3. Process active subscriptions due for renewal
    const { data: dueSubscriptions } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_payment_date', now.toISOString())

    if (dueSubscriptions && dueSubscriptions.length > 0) {
      for (const sub of dueSubscriptions) {
        await chargeStoredCard(sub, supabaseAdmin)
      }
    }

    // 4. Send reminders for active subscriptions due tomorrow
    const { data: activeDueSoon } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('reminder_sent', false)
      .lte('next_payment_date', tomorrow.toISOString())
      .gt('next_payment_date', now.toISOString())

    if (activeDueSoon && activeDueSoon.length > 0) {
      for (const sub of activeDueSoon) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
          if (authUser?.user?.email) {
            const amount = sub.amount || PLAN_PRICES[sub.plan_name] || 499
            await supabaseAdmin.functions.invoke('send-transactional-email', {
              body: {
                purpose: 'transactional',
                idempotency_key: `renewal-reminder-${sub.id}-${sub.next_payment_date}`,
                template_name: 'payment_due_reminder',
                to: authUser.user.email,
                subject: 'Abonelik Yenileme Hatırlatması',
                template_data: {
                  recipientName: authUser.user.user_metadata?.full_name || 'Değerli Kullanıcı',
                  paymentAmount: `₺${amount.toLocaleString('tr-TR')}`,
                  dueDate: new Date(sub.next_payment_date).toLocaleDateString('tr-TR'),
                  projectName: `${PLAN_NAMES[sub.plan_name] || sub.plan_name} Plan`,
                },
              },
            })
          }
        } catch (emailErr) {
          console.error(`Renewal reminder error for sub ${sub.id}:`, emailErr)
        }
        await supabaseAdmin.from('user_subscriptions').update({ reminder_sent: true }).eq('id', sub.id)
      }
    }

    // 5. Downgrade cancelled subscriptions whose period has ended
    const { data: expiredCancelled } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'cancelled')

    if (expiredCancelled && expiredCancelled.length > 0) {
      for (const sub of expiredCancelled) {
        const accessEnd = sub.trial_end && new Date(sub.trial_end) > new Date(sub.next_payment_date || '2000-01-01')
          ? new Date(sub.trial_end)
          : new Date(sub.next_payment_date || sub.trial_end)

        if (accessEnd <= now) {
          console.log(`Downgrading cancelled sub ${sub.id} — access period ended`)
          await supabaseAdmin.from('user_subscriptions').update({ status: 'expired' }).eq('id', sub.id)
          await supabaseAdmin.from('profiles').update({ plan: 'free' }).eq('user_id', sub.user_id)
        }
      }
    }

    const summary = {
      reminders_sent: trialEndingSoon?.length || 0,
      trials_charged: expiredTrials?.length || 0,
      renewals_charged: dueSubscriptions?.length || 0,
      renewal_reminders: activeDueSoon?.length || 0,
      cancelled_downgraded: expiredCancelled?.filter(s => {
        const end = s.trial_end && new Date(s.trial_end) > new Date(s.next_payment_date || '2000-01-01')
          ? new Date(s.trial_end) : new Date(s.next_payment_date || s.trial_end)
        return end <= now
      }).length || 0,
    }
    console.log('Process subscriptions summary:', summary)

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Process subscriptions error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})
