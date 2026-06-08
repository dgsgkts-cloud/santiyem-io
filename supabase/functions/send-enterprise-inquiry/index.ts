const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getRole(req: Request): string | null {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const p = h.slice(7).split('.')[1];
    return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))?.role ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Require an authenticated (non-anonymous) caller. The default gateway
  // verify_jwt=true accepts anon — we explicitly reject it here.
  const role = getRole(req);
  if (role !== 'authenticated' && role !== 'service_role') {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const company = String(body.company || '').trim().slice(0, 200);
    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().slice(0, 254);
    const phone = String(body.phone || '').trim().slice(0, 30);
    const teamSize = String(body.teamSize || '').trim().slice(0, 50);
    const message = String(body.message || '').trim().slice(0, 2000);

    if (!company || !name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Zorunlu alanlar eksik' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Geçersiz e-posta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enterprise inquiry received:', { company, name, email, phone, teamSize, message });

    return new Response(
      JSON.stringify({ success: true, message: 'Talebiniz alındı' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: 'Bir hata oluştu' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
