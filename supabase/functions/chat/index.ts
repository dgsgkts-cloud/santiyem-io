import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen Şantiyem'sın — Türk müteahhit, mühendis ve mimarların şantiye, proje ve hakediş yönetiminde profesyonel yapay zeka asistanısın.

=================================================== KİMLİĞİN VE TEMEL KURALLAR

Türkiye inşaat sektörüne özel, deneyimli bir proje yöneticisi gibi konuşursun

Her zaman Türkçe cevap verirsin

Direkt, net ve pratik cevaplar verirsin — gereksiz giriş cümleleri kurmazsın

Rakamlarla konuşursun: yüzde, gün, tutar, madde numarası

"Bence", "sanırım" yerine "şu kurala göre", "formül şu şekilde" dersin

Bilmediğin bir konuda tahmin yürütmek yerine "Bu konuda hukuki/teknik danışman görüşü alınız" dersin

Cevapların sonunda her zaman uyarı eklersin

=================================================== HAKEDİŞ HESAPLAMA VE KDV/STOPAJ

TEMEL FORMÜLLER:

Hakediş Net Tutarı = İş Kalemleri Toplamı
KDV = Hakediş Net × %20
Brüt Hakediş = Hakediş Net + KDV
Stopaj = Brüt Hakediş × %3 (4/10 oranında, yani %3 fiilen)
Net Ödenecek = Brüt Hakediş - Stopaj

ÖRNEK HESAP:
İş kalemleri toplamı: ₺485.000
KDV (%20): ₺97.000
Brüt: ₺582.000
Stopaj (%3): ₺17.460
Net ödenecek: ₺564.540

STOPAJ HAKKINDA:
Yıllara yaygın inşaat ve onarma işlerinde stopaj uygulanır (GVK Madde 94/3)
Stopaj oranı: %3 (Bakanlar Kurulu kararıyla belirlenmiş)
Stopaj, KDV dahil tutar üzerinden hesaplanır
Aynı yıl biten işlerde stopaj uygulanmaz

AVANS KESİNTİSİ:
Net ödenecek = Brüt Hakediş - Stopaj - (Avans × Hakediş oranı)

HAKEDIŞ SORULARINDA CEVAP FORMATI:
Formülü göster
Adım adım hesapla
Sonucu büyük ve net yaz
Varsa uyarı ekle
⚠️ "Bu hesaplama referans amaçlıdır. Sözleşme şartlarınızı ve güncel mevzuatı kontrol ediniz."

=================================================== PROJE GECİKME VE RİSK ANALİZİ

KULLANICI PROJE VERİSİ SORARSA:
Kullanıcının mevcut projelerini, iş kalemlerini ve ilerleme yüzdelerini analiz et.

GECİKME RİSKİ DEĞERLENDİRMESİ:
İlerleme % / Geçen süre % oranını hesapla
Oran < 0.8 ise: "Gecikme riski var"
Oran < 0.6 ise: "Ciddi gecikme riski, önlem alınmalı"
Örnek: Proje %45 ilerledi, sürenin %60'ı geçti → oran 0.75 → gecikme riski var

CEZAI ŞART HESABI:
Sözleşmede günlük gecikme cezası varsa hesapla
Örnek: "Günlük ₺5.000 ceza, 15 gün gecikme = ₺75.000 cezai şart riski"

KRİTİK YOL ANALİZİ:
Hangi iş kalemi gecikirse diğerlerini etkiler?
Örnek: "Temel betonu gecikmesi, üst yapı başlangıcını doğrudan etkiler"

PROJE RİSK SORULARINDA FORMAT:
🔴 Kritik Risk | 🟡 Orta Risk | 🟢 Düşük Risk
Her risk için: Açıklama → Olası etki → Önerilen önlem

=================================================== ŞANTİYE GÜNLÜĞÜ YORUMLAMA

KULLANICI GÜNLÜK VERİSİ PAYLAŞIRSA:
Şunları analiz et:
Üretim hızı: Bu haftaki adam/saat vs geçen hafta
Hava etkisi: Kaç gün çalışma durdu, ne kadar kayıp
İşçilik verimliliği: Kalem başına harcanan adam/saat makul mü?
Malzeme tüketimi: Bütçeyle uyumlu mu?
Tahmini tamamlanma: Mevcut hızla ne zaman biter?

HAFTALIK ÖZET FORMATI:
"📊 [Tarih Aralığı] Haftalık Özet
Çalışma: X gün (Y gün hava/tatil kaybı)
İşgücü: Ortalama X işçi/gün · Toplam X adam/saat
Üretim hızı: Geçen haftaya göre %X [artış/azalış]
🎯 Tahmin: Mevcut hızla [iş kalemi] X günde tamamlanır
⚠️ Dikkat: [varsa risk]"

=================================================== SÖZLEŞME VE HUKUKİ KONULAR

BİLGİ VEREBİLECEĞİN KONULAR:

Yapım İşleri Genel Şartnamesi:
Madde 16: Süre uzatımı halleri (mücbir sebepler)
Madde 22: Fiyat farkı hesabı
Madde 29: Hakediş düzenlenmesi ve ödeme süreleri (30 gün)
Madde 40: Sözleşmenin feshi

Gecikmiş Ödeme:
4735 sayılı Kanun Madde 12: Ödeme süresi 30 gün
30 günü aşan ödemelerde yasal faiz işler
Yasal faiz: 3095 sayılı Kanun kapsamında TCMB oranı
2025 yasal faiz oranı: %48/yıl → günlük: 0.1315%

Faiz Hesabı Formülü:
Faiz = Tutar × (Günlük Oran / 100) × Gecikme Günü
Örnek: ₺485.000 × 0.001315 × 45 gün = ₺28.704

Mücbir Sebep:
Deprem, sel, yangın: belgeli süre uzatımı hakkı
Resmi tatiller ve hava koşulları: sözleşmeye göre değişir
Başvuru süresi: genellikle 20 iş günü içinde

ASLA YAPMA:
Kesin hukuki tavsiye verme
"Dava açabilirsiniz" veya "kazanırsınız" deme
Her hukuki konunun sonunda: "Kesin karar için avukat görüşü alınız."

=================================================== MALZEME VE MALİYET HESAPLARI

2025 REFERANS BİRİM FİYATLAR:
Nervürlü demir: 28.000-30.000 ₺/ton
Hazır beton C25/30: 4.800-5.200 ₺/m³
Çimento (50kg): 280-320 ₺/çuval
Kalıp (ahşap): 1.200-1.400 ₺/m²
Tuğla (13.5cm duvar): 750-900 ₺/m²
Mantolama (8cm): 1.100-1.300 ₺/m²
İç sıva: 320-380 ₺/m²
İç boya: 180-220 ₺/m²
Seramik zemin: 650-900 ₺/m²
İşçilik (ortalama): 1.200-1.500 ₺/adam/gün

NOT: Piyasa koşullarına göre ±%15-20 sapma olabilir.

METRAJ HESAPLARI:
Beton hacmi = Uzunluk × Genişlik × Yükseklik
Demir kg/m³ = Beton hacmi × 80-120 kg (yapı tipine göre)
Kalıp alanı = Kolon + Kiriş + Döşeme yüzeyleri

MALIYET SORULARINDA FORMAT:
Formülü göster
Hesapla
Toplam ver
"±%15-20 sapma olabilir, güncel piyasa fiyatlarını kontrol ediniz."

=================================================== EKİP YÖNETİMİ VE GÖREV TAKİBİ

KULLANICI EKİP SORARSA:

Görev atama önerileri:
Kritik yol üzerindeki işler deneyimli ustaya atansın
Paralel yapılabilecek işleri listele
Bağımlılık analizi: "X bitmeden Y başlayamaz"

Verimlilik değerlendirmesi:
Adam/saat başına üretim miktarı hesapla
Sektör ortalamasıyla karşılaştır
Düşük verimlilik nedenlerini listele

Haftalık plan önerisi:
"Bu haftaki öncelikli işler:
1. [İş] — [Kişi] — [Süre]
2. [İş] — [Kişi] — [Süre]
Kritik: [İş] bu hafta tamamlanmalı, aksi halde [etki]"

=================================================== GENEL CEVAP KURALLARI

KULLANICI VERİSİ VARSA:
Kullanıcının proje, hakediş veya şantiye verisi sisteme iletilmişse, genel bilgi yerine o veriye özel cevap ver.
"Akdeniz Residence projenizde..." gibi kişiselleştirilmiş yanıt ver.

HESAPLAMA SORULARINDA: Her zaman adım adım göster, sonucu büyük yaz.
KARŞILAŞTIRMA SORULARINDA: Tablo formatında göster.
RİSK SORULARINDA: 🔴🟡🟢 renk kodlu liste kullan.
YASAL KONULARDA: Her zaman "Kesin karar için [avukat/yetkili mühendis] görüşü alınız." ekle.

GENEL UYARI (her cevabın sonunda):
"⚠️ Bu yanıt genel bilgi amaçlıdır. Projeye özel kararlar için sözleşmenizi ve güncel mevzuatı kontrol ediniz."

=================================================== KESINLIKLE YAPMA

Yanlış rakam verme — emin değilsen "yaklaşık" veya "güncel fiyatı kontrol edin" de
Kesin hukuki karar verme
Yapısal hesap sonucu verme (kolon boyutu, temel kapasitesi)
Resmi EKB belgesi düzenleyebileceğini ima etme
Tahmin yürütme — bilmiyorsan söyle`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const _authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: _ad, error: _ae } = await _authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (_ae || !_ad?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY yapılandırılmamış" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- RAG: Search user's documents for context ---
    let ragContext = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        
        const anonClient = createClient(supabaseUrl, anonKey);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await anonClient.auth.getUser(token);
        
        if (user) {
          const supabase = createClient(supabaseUrl, serviceKey);
          
          // Get the last user message for search
          const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
          const query = lastUserMsg?.content || "";
          
          if (query && query.length >= 3) {
            // Extract keywords
            const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3).slice(0, 8);
            
            if (keywords.length > 0) {
              let chunks: any[] = [];
              const tsQuery = keywords.join(" | ");
              
              // Search both user's own docs AND global docs
              const { data: ftsChunks, error: ftsError } = await supabase
                .from("document_chunks")
                .select("content, page_number, document_id")
                .or(`user_id.eq.${user.id},is_global.eq.true`)
                .textSearch("content", tsQuery, { config: "turkish" })
                .limit(5);
              
              if (!ftsError && ftsChunks && ftsChunks.length > 0) {
                chunks = ftsChunks;
              } else {
                // Fallback to ILIKE
                const { data: likeChunks } = await supabase
                  .from("document_chunks")
                  .select("content, page_number, document_id")
                  .or(`user_id.eq.${user.id},is_global.eq.true`)
                  .ilike("content", `%${keywords[0]}%`)
                  .limit(5);
                chunks = likeChunks || [];
              }
              
              if (chunks.length > 0) {
                // Get document names
                const docIds = [...new Set(chunks.map((c: any) => c.document_id))];
                const { data: docs } = await supabase
                  .from("documents")
                  .select("id, name")
                  .in("id", docIds);
                const docMap = new Map((docs || []).map((d: any) => [d.id, d.name]));
                
                ragContext = "\n\n=== YÜKLÜ BELGELERDEN BULUNAN İLGİLİ BÖLÜMLER ===\n";
                ragContext += "Aşağıdaki bilgiler kullanıcının yüklediği belgelerden alınmıştır. Bu bilgilere dayanarak cevap ver ve cevabın sonunda kaynakları göster.\n\n";
                
                for (const chunk of chunks) {
                  const docName = docMap.get(chunk.document_id) || "Bilinmeyen Belge";
                  ragContext += `📖 Kaynak: ${docName}, Sayfa ${chunk.page_number}\n`;
                  ragContext += chunk.content.substring(0, 500) + "\n\n";
                }
                
                ragContext += "=== BELGELERDEN ALINAN BİLGİLER SONU ===\n";
                ragContext += "Eğer belgede bilgi varsa mutlaka kaynak göster: '📖 Kaynak: [Belge Adı], Sayfa [X]' formatında.\n";
                ragContext += "Belgede bilgi yoksa: 'Bu konuda yüklü belgelerimde bilgi bulamadım. Genel bilgim doğrultusunda:' diyerek cevapla.\n";
              }
            }
          }
        }
      } catch (ragErr) {
        console.error("RAG search error (non-fatal):", ragErr);
      }
    }

    // --- CONSTRUCTION BRAIN: Intent detection + database-first data retrieval ---
    let projectDataContext = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      const token = authHeader!.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);

      if (user) {
        const sb = createClient(supabaseUrl, serviceKey);
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
        const userQuery = (lastUserMsg?.content || "").trim();

        if (userQuery && userQuery.length >= 3) {
          // 1) Intent detection via fast JSON classifier
          const now = new Date();
          const intentResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    `Sen bir intent sınıflandırıcısın. Türkçe kullanıcı sorusundan JSON çıkar. ` +
                    `Bugün: ${now.toISOString().slice(0, 10)}. ` +
                    `Şema: {"intent": one of ["PAYMENT_QUERY","PROJECT_QUERY","TASK_QUERY","HAKEDIS_QUERY","SITE_DIARY_QUERY","DOCUMENT_QUERY","MATERIAL_QUERY","CONTRACT_QUERY","PERSONNEL_QUERY","GENERAL_CHAT"], ` +
                    `"filters": {"date_from": "YYYY-MM-DD" | null, "date_to": "YYYY-MM-DD" | null, "name": string | null, "project_name": string | null, "limit": number | null}}. ` +
                    `"Bu ay" → içinde bulunulan ay başı-sonu. "Geçen ay" → önceki ay. "Bu hafta" → pazartesi-pazar. "En son" / "son yüklenen" → limit=1. "Bekleyen" → status filter için ismi filters.name'e "bekliyor" koy. Sadece JSON döndür.`,
                },
                { role: "user", content: userQuery },
              ],
            }),
          });

          let intent = "GENERAL_CHAT";
          let filters: any = {};
          if (intentResp.ok) {
            const j = await intentResp.json();
            try {
              const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}");
              intent = parsed.intent || "GENERAL_CHAT";
              filters = parsed.filters || {};
            } catch { /* ignore */ }
          }
          console.log("[Brain] intent:", intent, "filters:", filters);

          // 2) Query database based on intent (RLS bypassed via service key; always scope by user_id)
          const uid = user.id;
          const df = filters.date_from as string | null;
          const dt = filters.date_to as string | null;
          const nameFilter = (filters.name as string | null)?.toLowerCase() || null;
          const projectName = (filters.project_name as string | null) || null;
          const limit = Math.min(Number(filters.limit) || 10, 25);

          // Helper: resolve project_id from name
          let projectIdFilter: string | null = null;
          if (projectName) {
            const { data: proj } = await sb
              .from("projects").select("id, name").eq("user_id", uid)
              .ilike("name", `%${projectName}%`).limit(1).maybeSingle();
            if (proj) projectIdFilter = proj.id;
          }

          const fmt = (n: any) =>
            typeof n === "number" ? new Intl.NumberFormat("tr-TR").format(n) + " ₺" : String(n ?? "");
          const lines: string[] = [];

          if (intent === "PAYMENT_QUERY") {
            let q = sb.from("subcontractor_payments")
              .select("amount, payment_date, description, payment_method, project_id, subcontractor_id, subcontractors(name)")
              .eq("user_id", uid).order("payment_date", { ascending: false }).limit(limit);
            if (df) q = q.gte("payment_date", df);
            if (dt) q = q.lte("payment_date", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            const { data } = await q;
            let rows = data || [];
            if (nameFilter) rows = rows.filter((r: any) => (r.subcontractors?.name || "").toLowerCase().includes(nameFilter));
            const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            lines.push(`ÖDEMELER (${rows.length} kayıt, toplam ${fmt(total)}):`);
            rows.forEach((r: any) => lines.push(`- ${r.payment_date} · ${r.subcontractors?.name || "?"} · ${fmt(Number(r.amount))} · ${r.payment_method}${r.description ? " · " + r.description : ""}`));

            // Also project_expenses if generic "ödeme" query
            let eq = sb.from("project_expenses")
              .select("amount, expense_date, description, category, project_id")
              .eq("user_id", uid).order("expense_date", { ascending: false }).limit(limit);
            if (df) eq = eq.gte("expense_date", df);
            if (dt) eq = eq.lte("expense_date", dt);
            if (projectIdFilter) eq = eq.eq("project_id", projectIdFilter);
            const { data: exp } = await eq;
            if (exp && exp.length) {
              const et = exp.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              lines.push(`\nDİĞER PROJE GİDERLERİ (${exp.length} kayıt, toplam ${fmt(et)}):`);
              exp.slice(0, limit).forEach((r: any) => lines.push(`- ${r.expense_date} · ${r.category} · ${fmt(Number(r.amount))}${r.description ? " · " + r.description : ""}`));
            }
          } else if (intent === "HAKEDIS_QUERY") {
            let q = sb.from("project_hakedis")
              .select("period, amount, net_total, status, approval_status, created_at, payment_date, project_id")
              .eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
            if (df) q = q.gte("created_at", df);
            if (dt) q = q.lte("created_at", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (nameFilter && (nameFilter.includes("bekle") || nameFilter.includes("onay"))) q = q.eq("approval_status", "beklemede");
            const { data } = await q;
            lines.push(`HAKEDİŞLER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.period} · ${fmt(Number(r.net_total || r.amount))} · durum: ${r.status}/${r.approval_status} · ${r.created_at.slice(0, 10)}`));
          } else if (intent === "PROJECT_QUERY") {
            let q = sb.from("projects").select("name, client, status, progress, start_date, end_date, contract_amount").eq("user_id", uid).limit(limit);
            if (projectName) q = q.ilike("name", `%${projectName}%`);
            const { data } = await q;
            lines.push(`PROJELER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.name} · müşteri: ${r.client || "-"} · durum: ${r.status} · ilerleme: %${r.progress} · sözleşme: ${fmt(Number(r.contract_amount || 0))}`));
          } else if (intent === "TASK_QUERY") {
            const today = now.toISOString().slice(0, 10);
            let q = sb.from("tasks").select("title, status, priority, due_date, project_id").order("due_date", { ascending: true }).limit(limit);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (nameFilter && (nameFilter.includes("gecik") || nameFilter.includes("geç"))) q = q.lt("due_date", today).neq("status", "done");
            if (df) q = q.gte("due_date", df);
            if (dt) q = q.lte("due_date", dt);
            const { data } = await q;
            lines.push(`GÖREVLER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.title} · durum: ${r.status} · öncelik: ${r.priority} · termin: ${r.due_date || "-"}`));
          } else if (intent === "SITE_DIARY_QUERY") {
            let q = sb.from("site_diary_entries")
              .select("entry_date, work_status, work_done, weather_icon, project_id")
              .eq("user_id", uid).order("entry_date", { ascending: false }).limit(limit);
            if (df) q = q.gte("entry_date", df);
            if (dt) q = q.lte("entry_date", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            const { data } = await q;
            lines.push(`ŞANTİYE GÜNLÜĞÜ (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.entry_date} ${r.weather_icon} · ${r.work_status} · ${(r.work_done || "").slice(0, 200)}`));
          } else if (intent === "DOCUMENT_QUERY") {
            const { data } = await sb.from("documents")
              .select("name, page_count, status, created_at").eq("user_id", uid)
              .order("created_at", { ascending: false }).limit(limit);
            lines.push(`YÜKLÜ EVRAKLAR (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.name} · ${r.page_count} sayfa · ${r.status} · ${r.created_at.slice(0, 10)}`));
          } else if (intent === "MATERIAL_QUERY") {
            let mq = sb.from("materials").select("id, name, unit, project_id").eq("user_id", uid).limit(50);
            if (projectIdFilter) mq = mq.eq("project_id", projectIdFilter);
            if (nameFilter) mq = mq.ilike("name", `%${nameFilter}%`);
            const { data: mats } = await mq;
            const ids = (mats || []).map((m: any) => m.id);
            let entries: any[] = [];
            if (ids.length) {
              let eq2 = sb.from("material_entries").select("material_id, quantity, entry_date, unit_price, total_amount").in("material_id", ids).order("entry_date", { ascending: false }).limit(200);
              if (df) eq2 = eq2.gte("entry_date", df);
              if (dt) eq2 = eq2.lte("entry_date", dt);
              const { data: ed } = await eq2;
              entries = ed || [];
            }
            const totals = new Map<string, number>();
            entries.forEach((e: any) => totals.set(e.material_id, (totals.get(e.material_id) || 0) + Number(e.quantity || 0)));
            lines.push(`MALZEMELER (${(mats || []).length} kayıt):`);
            (mats || []).forEach((m: any) => lines.push(`- ${m.name} · toplam giriş: ${totals.get(m.id) || 0} ${m.unit}`));
          } else if (intent === "CONTRACT_QUERY") {
            let q = sb.from("contracts").select("name, counterparty, amount, status, start_date, end_date, contract_type").eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            if (nameFilter) q = q.or(`name.ilike.%${nameFilter}%,counterparty.ilike.%${nameFilter}%`);
            const { data } = await q;
            lines.push(`SÖZLEŞMELER (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.name} · ${r.counterparty} · ${fmt(Number(r.amount))} · ${r.status} · ${r.start_date || "-"} → ${r.end_date || "-"}`));
          } else if (intent === "PERSONNEL_QUERY") {
            let q = sb.from("personnel").select("full_name, occupation, employment_type, daily_wage, monthly_salary, is_active").eq("user_id", uid).limit(limit);
            if (nameFilter) q = q.ilike("full_name", `%${nameFilter}%`);
            const { data } = await q;
            lines.push(`PERSONEL (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.full_name} · ${r.occupation || "-"} · ${r.employment_type} · yevmiye ${fmt(Number(r.daily_wage || 0))} · maaş ${fmt(Number(r.monthly_salary || 0))} · aktif: ${r.is_active}`));
          }

          if (lines.length > 0) {
            projectDataContext =
              "\n\n=== KULLANICI PROJE VERİSİ (Lovable Cloud veritabanından çekildi) ===\n" +
              `Intent: ${intent}\n` +
              lines.join("\n") +
              "\n=== VERİ SONU ===\n" +
              "KURAL: Yukarıdaki gerçek proje verisine dayanarak cevap ver. Rakam uydurma. Veri yoksa 'Bu bilgi sistemde bulunamadı.' de. SQL veya JSON gösterme; deneyimli proje yöneticisi gibi kısa, profesyonel Türkçe özetle.\n";
          } else if (intent !== "GENERAL_CHAT") {
            projectDataContext =
              "\n\n=== KULLANICI PROJE VERİSİ ===\nIntent: " + intent + "\nSonuç: kayıt bulunamadı.\n" +
              "KURAL: Kullanıcıya 'Bu bilgi sistemde bulunamadı.' şeklinde nazikçe bildir. Tahmini rakam verme.\n";
          }
        }
      }
    } catch (brainErr) {
      console.error("Construction Brain error (non-fatal):", brainErr);
    }

    // Build messages with multimodal support
    const formattedMessages = messages.map((m: { role: string; content: string; attachments?: { base64: string; type: string }[] }) => {
      if (m.attachments && m.attachments.length > 0) {
        const contentParts: any[] = [{ type: "text", text: m.content }];
        for (const att of m.attachments) {
          const mimeType = att.type === "pdf" ? "application/pdf" : "image/png";
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${att.base64}` },
          });
        }
        return { role: m.role, content: contentParts };
      }
      return { role: m.role, content: m.content };
    });

    const systemPrompt = SYSTEM_PROMPT + ragContext + projectDataContext;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit aşıldı, lütfen biraz bekleyip tekrar deneyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredisi yetersiz, lütfen kredi ekleyin." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI servisi hatası" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
