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

DISCLAIMER KURALI (ÇOK ÖNEMLİ):
- Normal proje veri sorularında (ödeme listesi, hakediş, görev, ilerleme, malzeme, evrak, maliyet vb.) HİÇBİR uyarı/disclaimer EKLEME. Cevap temiz ve profesyonel olsun.
- SADECE mühendislik, yapısal güvenlik, hukuki, sözleşmesel veya iş güvenliği DEĞERLENDİRMESİ yaptığında cevabın sonuna TAM olarak şu satırı ekle (uyarı emojisi kullanma):
  "Bilgi: Bu değerlendirme mevcut proje verileri ve yapay zekâ analizine dayanmaktadır. Nihai mühendislik, hukuki ve iş güvenliği kararları yetkili uzman tarafından verilmelidir."

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
    const { data: _ad, error: _ae } = await _authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (_ae || !_ad?.claims?.sub) {
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
        const { data: claimsData } = await anonClient.auth.getClaims(token);
        const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub as string } : null;
        
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
      const { data: claimsData2 } = await anonClient.auth.getClaims(token);
      const user = claimsData2?.claims?.sub ? { id: claimsData2.claims.sub as string } : null;

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
                    `"filters": {"date_from": "YYYY-MM-DD" | null, "date_to": "YYYY-MM-DD" | null, "name": string | null, "project_name": string | null, "keyword": string | null, "limit": number | null, "aggregate": "sum" | "top_by_recipient" | "latest" | null}}. ` +
                    `"Bu ay" → içinde bulunulan ay başı-sonu. "Geçen ay" → önceki ay. "Bu hafta" → pazartesi-pazar. ` +
                    `"En son" / "son yüklenen" → limit=1, aggregate="latest". ` +
                    `"Ne kadar / toplam / kaç ton / kaç m3" → aggregate="sum". ` +
                    `"En çok ... yaptığımız" → aggregate="top_by_recipient". ` +
                    `"Beton dökümü / kalıp / demir / hafriyat" gibi iş kalemi geçerse SITE_DIARY_QUERY için keyword'e yaz. ` +
                    `"Bekleyen" → filters.name = "bekliyor". "Geciken" → filters.name = "gecikti". Sadece JSON döndür.`,
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
          const keyword = (filters.keyword as string | null) || null;
          const aggregate = (filters.aggregate as string | null) || null;
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
            // Detect whether the user is explicitly asking about SUBCONTRACTOR payments.
            // We only classify a payment as "subcontractor" when there's a hard signal:
            //   - subcontractor_payments row (has FK subcontractor_id) — authoritative
            //   - cash_payments row with category='Taşeron Ödemesi' OR source_type='subcontractor_payment'
            // Everything else (fuel, excavation, office, materials) is NEVER returned as subcontractor.
            const qText = (userQuery || "").toLowerCase();
            const nameHint = (nameFilter || "");
            const subcontractorScope =
              /taşeron|taseron|taşoron|subcontractor|alt ?yüklenici|alt ?yuklenici/.test(qText) ||
              /taşeron|taseron|subcontractor/.test(nameHint);

            // 1) Authoritative subcontractor payments (has subcontractor_id FK)
            let q = sb.from("subcontractor_payments")
              .select("amount, payment_date, description, payment_method, project_id, subcontractor_id, subcontractors(name)")
              .eq("user_id", uid).order("payment_date", { ascending: false }).limit(limit);
            if (df) q = q.gte("payment_date", df);
            if (dt) q = q.lte("payment_date", dt);
            if (projectIdFilter) q = q.eq("project_id", projectIdFilter);
            const { data } = await q;
            let rows = (data || []).filter((r: any) => r.subcontractor_id); // ignore anything not confidently classified
            if (nameFilter && !subcontractorScope) {
              rows = rows.filter((r: any) => (r.subcontractors?.name || "").toLowerCase().includes(nameFilter));
            }
            const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            lines.push(`TAŞERON ÖDEMELERİ (${rows.length} kayıt, toplam ${fmt(total)}):`);
            rows.forEach((r: any) => lines.push(`- ${r.payment_date} · ${r.subcontractors?.name || "?"} · ${fmt(Number(r.amount))} · ${r.payment_method}${r.description ? " · " + r.description : ""}`));

            // Top-by-recipient aggregation: "en çok ödeme yaptığımız taşeron"
            if (aggregate === "top_by_recipient" || /en\s+(cok|çok)/.test(qText)) {
              const agg = new Map<string, number>();
              rows.forEach((r: any) => {
                const k = r.subcontractors?.name || "?";
                agg.set(k, (agg.get(k) || 0) + Number(r.amount || 0));
              });
              const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
              if (top.length) {
                lines.push(`\nTAŞERON BAZINDA SIRALAMA:`);
                top.forEach(([n, v], i) => lines.push(`${i + 1}. ${n} · ${fmt(v)}`));
              }
            }

            if (subcontractorScope) {
              // Also pull cash_payments explicitly categorized as Taşeron Ödemesi that AREN'T mirrors
              // of a subcontractor_payments row (source_type is null / not subcontractor_payment).
              let cq = sb.from("cash_payments")
                .select("amount, payment_date, description, category, recipient, project_id, source_type")
                .eq("user_id", uid)
                .eq("category", "Taşeron Ödemesi")
                .is("source_type", null)
                .order("payment_date", { ascending: false }).limit(limit);
              if (df) cq = cq.gte("payment_date", df);
              if (dt) cq = cq.lte("payment_date", dt);
              if (projectIdFilter) cq = cq.eq("project_id", projectIdFilter);
              const { data: cash } = await cq;
              if (cash && cash.length) {
                const ct = cash.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
                lines.push(`\nEK TAŞERON KASA ÖDEMELERİ (${cash.length} kayıt, toplam ${fmt(ct)}):`);
                cash.forEach((r: any) => lines.push(`- ${r.payment_date} · ${r.recipient || "?"} · ${fmt(Number(r.amount))}${r.description ? " · " + r.description : ""}`));
              }
              const grand = total + (cash || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              lines.push(`\nGENEL TAŞERON TOPLAMI: ${fmt(grand)}`);
              lines.push(`\nNOT: Bu listede yalnızca kesin olarak taşeron olarak sınıflandırılmış ödemeler var. Yakıt, kazı, malzeme veya ofis giderleri gibi sınıflandırılamayan kayıtlar dahil edilmemiştir.`);
            } else {
              // Generic "ödeme" query — show classified extras but keep them clearly labeled.
              let eq = sb.from("project_expenses")
                .select("amount, expense_date, description, category, project_id")
                .eq("user_id", uid).order("expense_date", { ascending: false }).limit(limit);
              if (df) eq = eq.gte("expense_date", df);
              if (dt) eq = eq.lte("expense_date", dt);
              if (projectIdFilter) eq = eq.eq("project_id", projectIdFilter);
              const { data: exp } = await eq;
              if (exp && exp.length) {
                const et = exp.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
                lines.push(`\nDİĞER PROJE GİDERLERİ (${exp.length} kayıt, toplam ${fmt(et)}) — TAŞERON DEĞİLDİR:`);
                exp.slice(0, limit).forEach((r: any) => lines.push(`- ${r.expense_date} · ${r.category} · ${fmt(Number(r.amount))}${r.description ? " · " + r.description : ""}`));
              }
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
            let q = sb.from("projects").select("id, name, client, status, progress, start_date, end_date, contract_amount").eq("user_id", uid).limit(limit);
            if (projectName) q = q.ilike("name", `%${projectName}%`);
            const { data } = await q;
            const projRows = data || [];
            lines.push(`PROJELER (${projRows.length} kayıt):`);
            projRows.forEach((r: any) => lines.push(`- ${r.name} · müşteri: ${r.client || "-"} · durum: ${r.status} · ilerleme: %${r.progress} · sözleşme: ${fmt(Number(r.contract_amount || 0))}`));
            // Aggregate: toplam proje maliyeti / sözleşme
            if (aggregate === "sum" || /toplam|maliyet/.test((userQuery || "").toLowerCase())) {
              const pids = projRows.map((p: any) => p.id);
              let expTotal = 0;
              if (pids.length) {
                const { data: exps } = await sb.from("project_expenses").select("amount").in("project_id", pids);
                expTotal = (exps || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
              }
              const contractTotal = projRows.reduce((s: number, r: any) => s + Number(r.contract_amount || 0), 0);
              lines.push(`\nTOPLAM SÖZLEŞME BEDELİ: ${fmt(contractTotal)}`);
              lines.push(`TOPLAM PROJE GİDERİ: ${fmt(expTotal)}`);
            }
          } else if (intent === "TASK_QUERY") {
            const today = now.toISOString().slice(0, 10);
            let q = sb.from("tasks").select("title, status, priority, due_date, project_id, assigned_to").order("due_date", { ascending: true }).limit(limit);
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
            if (keyword) q = q.ilike("work_done", `%${keyword}%`);
            const { data } = await q;
            lines.push(`ŞANTİYE GÜNLÜĞÜ${keyword ? ` (anahtar: "${keyword}")` : ""} (${(data || []).length} kayıt):`);
            (data || []).forEach((r: any) => lines.push(`- ${r.entry_date} ${r.weather_icon || ""} · ${r.work_status} · ${(r.work_done || "").slice(0, 200)}`));
          } else if (intent === "DOCUMENT_QUERY") {
            const effectiveLimit = aggregate === "latest" ? 1 : limit;
            const { data } = await sb.from("documents")
              .select("name, page_count, status, created_at").eq("user_id", uid)
              .order("created_at", { ascending: false }).limit(effectiveLimit);
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

    // ============================================================
    // ACTION ASSISTANT — tool-calling with confirmation gating
    // ============================================================
    // Detect action intent from last user message. If action, run a
    // non-streaming tool loop and return the final text as an SSE stream.
    try {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      const rawText = (lastUserMsg?.content || "").toString().toLowerCase();
      const ACTION_RE =
        /\b(kaydet|ekle|oluştur|olustur|yap(?:ay[ıi]m|al[ıi]m)?|öde|ode|gir(?:iş|is)?|ata(?:y[ıi]m)?|başlat|baslat|yeni\s+(görev|gorev|hakedi[şs]|ödeme|odeme|kay[ıi]t|malzeme|not))\b/;
      const CONFIRM_RE = /\b(evet|onayl[ıi]yorum|onayla|onay|tamam|kaydet|geç|gec|ilerle|olur|hadi)\b/;
      const isAction = ACTION_RE.test(rawText) || (CONFIRM_RE.test(rawText) && messages.length >= 3);

      if (isAction && Deno.env.get("SUPABASE_URL")) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const anon = createClient(supabaseUrl, anonKey);
        const token = authHeader!.replace("Bearer ", "");
        const { data: claimsData3 } = await anon.auth.getClaims(token);
        const user = claimsData3?.claims?.sub ? { id: claimsData3.claims.sub as string } : null;

        if (user) {
          const sb = createClient(supabaseUrl, serviceKey);
          const uid = user.id;
          const today = new Date().toISOString().slice(0, 10);

          // --- Tool schemas (OpenAI compatible) ---
          const tools = [
            {
              type: "function",
              function: {
                name: "resolve_lookups",
                description: "Resolve human-readable names into database IDs. Call before mutation tools. Returns matches or ambiguity list.",
                parameters: {
                  type: "object",
                  properties: {
                    project_name: { type: "string" },
                    subcontractor_name: { type: "string" },
                    personnel_name: { type: "string" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_subcontractor_payment",
                description: "Save a subcontractor payment. Set confirmed=false first to preview the summary. Only set confirmed=true after the user explicitly approves (evet/onaylıyorum/tamam).",
                parameters: {
                  type: "object",
                  required: ["subcontractor_id", "amount", "payment_method", "confirmed"],
                  properties: {
                    subcontractor_id: { type: "string", description: "UUID from resolve_lookups" },
                    amount: { type: "number" },
                    payment_method: { type: "string", enum: ["nakit", "havale", "cek", "kredi_karti"] },
                    payment_date: { type: "string", description: "YYYY-MM-DD, defaults today" },
                    project_id: { type: "string" },
                    description: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_task",
                description: "Create a new task. Preview first with confirmed=false.",
                parameters: {
                  type: "object",
                  required: ["project_id", "title", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    title: { type: "string" },
                    priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
                    due_date: { type: "string" },
                    description: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_hakedis_draft",
                description: "Create a draft hakediş (progress payment). Preview first with confirmed=false.",
                parameters: {
                  type: "object",
                  required: ["project_id", "period", "amount", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    period: { type: "string", description: "e.g. '2026-06' or 'Haziran 2026'" },
                    amount: { type: "number", description: "Gross iş kalemleri toplamı (KDV hariç)" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_site_diary",
                description: "Add a site diary entry for a project on a date. Preview first.",
                parameters: {
                  type: "object",
                  required: ["project_id", "entry_date", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    entry_date: { type: "string" },
                    work_status: { type: "string", enum: ["normal", "durdu"] },
                    work_done: { type: "string" },
                    general_note: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_material_entry",
                description: "Add a material stock entry (giriş) to a project. Preview first.",
                parameters: {
                  type: "object",
                  required: ["project_id", "material_name", "quantity", "confirmed"],
                  properties: {
                    project_id: { type: "string" },
                    material_name: { type: "string" },
                    unit: { type: "string" },
                    quantity: { type: "number" },
                    unit_price: { type: "number" },
                    supplier: { type: "string" },
                    entry_date: { type: "string" },
                    confirmed: { type: "boolean" },
                  },
                },
              },
            },
          ];

          const fmtTRY = (n: number) => new Intl.NumberFormat("tr-TR").format(n) + " ₺";

          // --- Tool executor ---
          async function runTool(name: string, args: any): Promise<any> {
            try {
              if (name === "resolve_lookups") {
                const out: any = {};
                if (args.project_name) {
                  const { data } = await sb.from("projects").select("id, name, client").eq("user_id", uid).ilike("name", `%${args.project_name}%`).limit(5);
                  out.projects = data || [];
                }
                if (args.subcontractor_name) {
                  const { data } = await sb.from("subcontractors").select("id, name, specialty").eq("user_id", uid).ilike("name", `%${args.subcontractor_name}%`).limit(5);
                  out.subcontractors = data || [];
                }
                if (args.personnel_name) {
                  const { data } = await sb.from("personnel").select("id, full_name, occupation").eq("user_id", uid).ilike("full_name", `%${args.personnel_name}%`).limit(5);
                  out.personnel = data || [];
                }
                return out;
              }

              if (name === "save_subcontractor_payment") {
                const missing: string[] = [];
                if (!args.subcontractor_id) missing.push("taşeron");
                if (!(args.amount > 0)) missing.push("tutar");
                if (!args.payment_method) missing.push("ödeme yöntemi");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const { data: sub } = await sb.from("subcontractors").select("name, user_id").eq("id", args.subcontractor_id).maybeSingle();
                if (!sub || sub.user_id !== uid) return { status: "ERROR", error: "Taşeron bulunamadı" };
                const summary = {
                  action: "Taşeron Ödemesi",
                  taşeron: sub.name,
                  tutar: fmtTRY(Number(args.amount)),
                  ödeme_yöntemi: args.payment_method,
                  tarih: args.payment_date || today,
                  proje_id: args.project_id || null,
                  açıklama: args.description || "",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("subcontractor_payments").insert({
                  user_id: uid,
                  subcontractor_id: args.subcontractor_id,
                  amount: args.amount,
                  payment_date: args.payment_date || today,
                  payment_method: args.payment_method,
                  project_id: args.project_id || null,
                  description: args.description || null,
                  status: "odendi",
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_task") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.title) missing.push("başlık");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const summary = {
                  action: "Görev",
                  proje_id: args.project_id,
                  başlık: args.title,
                  öncelik: args.priority || "normal",
                  termin: args.due_date || null,
                  açıklama: args.description || "",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("tasks").insert({
                  project_id: args.project_id,
                  title: args.title,
                  description: args.description || "",
                  priority: args.priority || "normal",
                  due_date: args.due_date || null,
                  status: "todo",
                  created_by: uid,
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_hakedis_draft") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.period) missing.push("dönem");
                if (!(args.amount > 0)) missing.push("tutar");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const kdv = Number(args.amount) * 0.20;
                const gross = Number(args.amount) + kdv;
                const stopaj = gross * 0.03;
                const net = gross - stopaj;
                const summary = {
                  action: "Hakediş Taslağı",
                  proje_id: args.project_id,
                  dönem: args.period,
                  iş_kalemleri: fmtTRY(Number(args.amount)),
                  kdv: fmtTRY(kdv),
                  brüt: fmtTRY(gross),
                  stopaj: fmtTRY(stopaj),
                  net_ödenecek: fmtTRY(net),
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("project_hakedis").insert({
                  user_id: uid,
                  project_id: args.project_id,
                  period: args.period,
                  amount: args.amount,
                  kdv,
                  net,
                  gross_total: gross,
                  deductions_total: stopaj,
                  net_total: net,
                  status: "Bekliyor",
                  approval_status: "taslak",
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_site_diary") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.entry_date) missing.push("tarih");
                if (missing.length) return { status: "MISSING_FIELDS", missing };
                const summary = {
                  action: "Şantiye Günlüğü",
                  proje_id: args.project_id,
                  tarih: args.entry_date,
                  durum: args.work_status || "normal",
                  yapılan_iş: args.work_done || "",
                  not: args.general_note || "",
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };
                const { data, error } = await sb.from("site_diary_entries").upsert({
                  user_id: uid,
                  project_id: args.project_id,
                  entry_date: args.entry_date,
                  work_status: args.work_status || "normal",
                  work_done: args.work_done || "",
                  general_note: args.general_note || "",
                  status: "published",
                }, { onConflict: "project_id,entry_date" }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              if (name === "save_material_entry") {
                const missing: string[] = [];
                if (!args.project_id) missing.push("proje");
                if (!args.material_name) missing.push("malzeme adı");
                if (!(args.quantity > 0)) missing.push("miktar");
                if (missing.length) return { status: "MISSING_FIELDS", missing };

                const unit = args.unit || "adet";
                const qty = Number(args.quantity);
                const price = Number(args.unit_price || 0);
                const summary = {
                  action: "Malzeme Girişi",
                  proje_id: args.project_id,
                  malzeme: args.material_name,
                  miktar: `${qty} ${unit}`,
                  birim_fiyat: price ? fmtTRY(price) : "-",
                  toplam: price ? fmtTRY(qty * price) : "-",
                  tedarikçi: args.supplier || "-",
                  tarih: args.entry_date || today,
                };
                if (!args.confirmed) return { status: "CONFIRM_REQUIRED", summary };

                // Find or create material
                let matId: string | null = null;
                const { data: existing } = await sb.from("materials").select("id")
                  .eq("user_id", uid).eq("project_id", args.project_id)
                  .ilike("name", args.material_name).limit(1).maybeSingle();
                if (existing) matId = existing.id;
                else {
                  const { data: created, error: cErr } = await sb.from("materials").insert({
                    user_id: uid, project_id: args.project_id, name: args.material_name, unit,
                  }).select("id").maybeSingle();
                  if (cErr) return { status: "ERROR", error: cErr.message };
                  matId = created!.id;
                }
                const { data, error } = await sb.from("material_entries").insert({
                  user_id: uid,
                  material_id: matId,
                  entry_date: args.entry_date || today,
                  quantity: qty,
                  unit_price: price,
                  total_amount: qty * price,
                  supplier: args.supplier || null,
                }).select("id").maybeSingle();
                if (error) return { status: "ERROR", error: error.message };
                return { status: "OK", id: data?.id, summary };
              }

              return { status: "ERROR", error: "Unknown tool" };
            } catch (e) {
              return { status: "ERROR", error: e instanceof Error ? e.message : "tool failed" };
            }
          }

          const ACTION_SYSTEM = `${SYSTEM_PROMPT}${ragContext}${projectDataContext}

=================================================== EYLEM MODU (ACTION ASSISTANT)
Şu anda EYLEM MODUNDASIN. Kullanıcı bir işlem yapmak istiyor (ödeme, görev, hakediş, günlük, malzeme).

KURALLAR:
1. Önce eksik bilgileri sor (tek tek, kısa cümlelerle). Mesela "Tutar ne kadar?", "Hangi projeye?".
2. İnsan ismini (proje, taşeron, personel) UUID'ye çevirmek için önce 'resolve_lookups' aracını çağır.
3. Tüm bilgiler tamamlanınca, ilgili save_* aracını **confirmed=false** ile çağır → araç sana özet döndürecek.
4. Bu özeti kullanıcıya sun ve **"Onaylıyor musunuz?"** diye sor. Örnek format:

   📋 **Onay bekliyor:**
   - Taşeron: Mehmet Usta
   - Tutar: 15.000 ₺
   - Yöntem: Nakit
   - Tarih: 2026-07-03
   
   Kaydetmek için "evet" yazın.

5. Kullanıcı 'evet/onaylıyorum/tamam' derse, AYNI aracı bu kez **confirmed=true** ile çağır ve kaydı yap.
6. Kullanıcı onaylamadan ASLA confirmed=true kullanma. Bu kural mutlaktır.
7. MISSING_FIELDS dönerse, eksikleri kullanıcıya sor. ERROR dönerse hatayı açıkla.
8. Kayıt başarılı olunca "✅ Kaydedildi." de ve kısa özet ver.

Cevabın Türkçe, kısa ve profesyonel olsun. Gereksiz sohbet etme.`;

          // --- Tool-calling loop ---
          const convo: any[] = [
            { role: "system", content: ACTION_SYSTEM },
            ...formattedMessages,
          ];

          let finalText = "";
          for (let step = 0; step < 6; step++) {
            const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: convo,
                tools,
                tool_choice: "auto",
              }),
            });
            if (!r.ok) {
              const errTxt = await r.text();
              console.error("[Action] gateway error:", r.status, errTxt);
              if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit aşıldı." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              if (r.status === 402) return new Response(JSON.stringify({ error: "AI kredisi yetersiz." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              return new Response(JSON.stringify({ error: "AI servisi hatası" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            const j = await r.json();
            const msg = j.choices?.[0]?.message;
            if (!msg) break;
            convo.push(msg);
            const toolCalls = msg.tool_calls || [];
            if (!toolCalls.length) {
              finalText = msg.content || "";
              break;
            }
            for (const tc of toolCalls) {
              let parsedArgs: any = {};
              try { parsedArgs = JSON.parse(tc.function?.arguments || "{}"); } catch { /* keep {} */ }
              console.log("[Action] tool:", tc.function?.name, parsedArgs);
              const result = await runTool(tc.function?.name, parsedArgs);
              convo.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
          }

          if (!finalText) finalText = "İşleme devam edemedim. Lütfen tekrar deneyin.";

          // Emit as a single SSE chunk so the frontend's streaming reader consumes it.
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              const chunk = { choices: [{ delta: { content: finalText } }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      }
    } catch (actionErr) {
      console.error("Action Assistant error (falling back to chat):", actionErr);
    }

    // ============================================================
    // Default: streaming Q&A
    // ============================================================
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
