import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company, name, email, phone, teamSize, message } = await req.json();

    if (!company || !name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Zorunlu alanlar eksik' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the inquiry - in production this would send an email
    console.log('Enterprise inquiry received:', { company, name, email, phone, teamSize, message });

    return new Response(
      JSON.stringify({ success: true, message: 'Talebiniz alındı' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Bir hata oluştu' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
