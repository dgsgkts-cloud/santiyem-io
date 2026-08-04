import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ALLOWED_BINA_TIPI = ['Konut', 'Ticari', 'Sanayi', 'Kamu', 'Diğer'];

function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Geçersiz istek' }, 400);

    const ad_soyad = clean((body as any).ad_soyad, 120);
    const telefonRaw = clean((body as any).telefon, 25);
    const il_ilce = clean((body as any).il_ilce, 120);
    const bina_tipi = clean((body as any).bina_tipi, 40) || 'Konut';
    const mesaj = clean((body as any).mesaj, 1000);

    const digits = telefonRaw.replace(/\D/g, '');
    if (ad_soyad.length < 2 || ad_soyad.length > 120) return json({ error: 'Geçersiz ad soyad' }, 400);
    if (digits.length < 10 || digits.length > 15) return json({ error: 'Geçersiz telefon' }, 400);
    if (il_ilce.length < 2) return json({ error: 'Geçersiz il/ilçe' }, 400);
    if (!ALLOWED_BINA_TIPI.includes(bina_tipi)) return json({ error: 'Geçersiz bina tipi' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // Throttle: max 3 submissions per phone number per 24h, and reject exact duplicates.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('ekb_basvurulari')
      .select('id', { count: 'exact', head: true })
      .eq('telefon', telefonRaw)
      .gte('created_at', since);

    if ((count ?? 0) >= 3) {
      return json({ error: 'Çok fazla başvuru gönderildi, lütfen daha sonra tekrar deneyin.' }, 429);
    }

    const { error } = await supabase.from('ekb_basvurulari').insert({
      ad_soyad,
      telefon: telefonRaw,
      il_ilce,
      bina_tipi,
      mesaj: mesaj || null,
    });

    if (error) {
      console.error('ekb lead insert failed');
      return json({ error: 'Gönderilemedi, lütfen tekrar deneyin.' }, 500);
    }

    return json({ success: true });
  } catch (_e) {
    return json({ error: 'Bir hata oluştu' }, 500);
  }
});
