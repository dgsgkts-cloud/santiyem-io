// Intent classification + sticky project context.
// Moved verbatim from index.ts (Sprint 8.1 Phase 4). Pure functions, no
// closures or side effects — behavior is byte-identical to the original.
import {
  resolveEntity,
  type EntityCandidate,
} from "../../_shared/entityResolver.ts";
import { extractDateWindow } from "../utils/parsing.ts";

export function classifyIntentHeuristic(
  rawQuery: string,
  projectNames: Array<{ id: string; name: string }>,
): { intent: string; filters: any; confident: boolean } {
  const q = rawQuery.toLowerCase();
  const filters: any = {};
  const dw = extractDateWindow(q);
  filters.date_from = dw.df;
  filters.date_to = dw.dt;

  if (/\btoplam\b|\bne kadar\b|\bkaç ton\b|\bkac ton\b|\bkaç m3\b|\bkac m3\b/.test(q)) filters.aggregate = "sum";
  else if (/\ben\s+(çok|cok)\b/.test(q)) filters.aggregate = "top_by_recipient";
  else if (/\ben son\b|\bson\s+(yüklenen|yuklenen|eklenen)\b/.test(q)) { filters.aggregate = "latest"; filters.limit = 1; }

  // Project name match — normalized + fuzzy (Turkish char folding, voice corrections)
  {
    const candidates: EntityCandidate[] = projectNames.map(p => ({ id: p.id, name: p.name }));
    const outcome = resolveEntity(rawQuery, candidates, { autoSelectThreshold: 0.85, suggestThreshold: 0.62 });
    if (outcome.status === "auto") {
      filters.project_name = outcome.match.name;
    } else if (outcome.status === "ambiguous") {
      filters.project_name = outcome.matches[0].candidate.name;
      filters.project_ambiguous = outcome.matches.map(m => m.candidate.name);
    }
  }

  let intent = "GENERAL_CHAT";
  let confident = true;
  // Order matters — more specific patterns first. Domain-specific intents
  // (LOW_STOCK, TODAYS_TASKS, PROJECT_HEALTH, …) MUST come before the
  // broader family intents (MATERIAL_QUERY, TASK_QUERY, PROJECT_OVERVIEW).
  if (/(kaç|kac|ne kadar|kimler)\s+(kişi|kisi|işçi|isci|adam|personel).*(şantiye|santiye|sahada|iş\s*başı|is\s*basi|giriş yaptı|giris yapti|check[- ]?in)|şu an.*(sahada|şantiyede|santiyede)|(sahada|şantiyede|santiyede).*(şu an|bugün|bugun|kim|kaç|kac)|puantaj|yoklama|(check[- ]?in|check[- ]?out)/.test(q))
    intent = "LIVE_PERSONNEL";
  else if (/(yevmiye|yevmiyeli|daily\s*wage|günlük\s*ücret|gunluk\s*ucret)|(kaç|kac|toplam|ortalama|en\s*(fazla|yüksek|yuksek|çok|cok))\s*(yevmiyeli|işçi|isci|çalışan|calisan|maliyet)/.test(q))
    intent = "WAGE_ANALYSIS";
  else if (/(fazla\s*mesai|overtime|uzun\s*(mesai|shift)|gece\s*mesai)/.test(q))
    intent = "PERSONNEL_OVERTIME";
  else if (/devamsız|devamsiz|geç kaldı|gec kaldi|(giriş|giris|çıkış|cikis)\s*(kayd|saat)|attendance|\bmesai\b/.test(q))
    intent = "ATTENDANCE";

  else if (/(brifing|briefing|günaydın özet|gunaydin ozet|executive|yönetici özeti|yonetici ozeti|günlük\s*özet|gunluk\s*ozet)/.test(q)) intent = "EXECUTIVE_BRIEFING";
  else if (/(proje\s*(sağlık|saglik|health)|health\s*score|risk\s*skor|genel\s*sağlık|genel\s*saglik|proje\s*durumu\s*(nasıl|nasil))/.test(q)) intent = "PROJECT_HEALTH";
  else if (/(en\s*büyük\s*risk|en\s*buyuk\s*risk|(hangi|neler).*risk|risk\s*var\s*mı|risk\s*var\s*mi|kritik\s*(durum|sorun)|tehlike)/.test(q)) intent = "PROJECT_RISKS";
  else if (/(hangi\s*proje.*(geriden|geri\s*kal|yavaş|yavas|gecik)|proje\s*ilerleme|proje\s*progres|progress|ilerleme\s*durumu)/.test(q)) intent = "PROJECT_PROGRESS";
  else if (/hakediş|hakedis|progress payment/.test(q)) intent = "HAKEDIS_QUERY";
  else if (/taşeron|taseron|alt yüklenici|alt yuklenici|subcontractor/.test(q)) intent = "SUBCONTRACTOR";
  else if (/(nakit akış|nakit akis|finansal|mali durum|kar\s*zarar|karlılık|karlilik|gelir\s*gider|bilanço|bilanco|cash\s*flow|financial)/.test(q)) intent = "FINANCIAL_SUMMARY";
  else if (/(gecik(en|miş|mis)|vadesi geç|vadesi gec|overdue).*(ödeme|odeme|payment|fatura|hakediş|hakedis)|(ödeme|odeme|payment|fatura).*(gecik|overdue)/.test(q)) intent = "OVERDUE_PAYMENTS";
  else if (/(yaklaşan|yaklasan|önümüzdeki|onumuzdeki|gelecek|upcoming|bekleyen).*(ödeme|odeme|payment|fatura|vade)|vadesi\s+(yaklaş|yaklas|gelen)/.test(q)) intent = "UPCOMING_PAYMENTS";
  else if (/(ödeme|odeme|payment|nakit|havale|çek\b|cek\b|kasa|tahsilat)/.test(q)) intent = "PAYMENT_QUERY";
  else if (/(bugün|bugun|today).*(görev|gorev|iş\b|is\b|planl|task)|bugünkü\s*(iş|is|görev|gorev)|bugunku\s*(iş|is|görev|gorev)/.test(q)) intent = "TODAYS_TASKS";
  else if (/görev|gorev|task|yapılacak|yapilacak|to-?do|termin|geciken|bekleyen/.test(q)) intent = "TASK_QUERY";
  else if (/şantiye günlüğü|santiye gunlugu|günlük|gunluk|beton döküm|beton dokum|kalıp|kalip|hafriyat|iş yapıldı|is yapildi/.test(q)) intent = "SITE_DIARY_QUERY";
  else if (/(toplantı\s*(özet|ozet|not|karar)|meeting\s*(summary|notes)|son\s*toplantı|son\s*toplanti|aksiyon\s*madde)/.test(q)) intent = "MEETING_SUMMARY";
  else if (/belge|evrak|döküman|dokuman|document|dosya|pdf/.test(q)) intent = "DOCUMENT_QUERY";
  else if (/(kritik\s*stok|az\s*kaldı|az\s*kaldi|düşük\s*stok|dusuk\s*stok|azaldı|azaldi|bitmek\s*üzere|bitmek\s*uzere|low\s*stock|stok\s*(kritik|azaldı|azaldi|az))/.test(q)) intent = "LOW_STOCK";
  else if (/malzeme|stok|çimento|cimento|beton|demir\b|kum|çakıl|cakil|material/.test(q)) intent = "MATERIAL_QUERY";
  else if (/sözleşme|sozlesme|kontrat|contract/.test(q)) intent = "CONTRACT_QUERY";
  else if (/personel|işçi|isci|çalışan|calisan|usta|kalfa|maaş|maas|yevmiye|foreman|worker/.test(q)) intent = "PERSONNEL_QUERY";
  else if (/(genel durum|özet|ozet|overview|proje durumu|nasıl gidiyor|nasil gidiyor)/.test(q)) intent = "PROJECT_OVERVIEW";
  else if (/proje|inşaat|insaat|şantiye|santiye|villa|bina|site/.test(q)) intent = "PROJECT_QUERY";
  else { intent = "GENERAL_CHAT"; confident = false; }

  if (/\bbekle/.test(q)) filters.name = "bekliyor";
  else if (/\bgecik/.test(q)) filters.name = "gecikti";

  return { intent, filters, confident };
}

/**
 * Sticky project context: if the current user turn doesn't clearly name a
 * project, walk back through the last few conversation turns and inherit
 * whichever project the user was previously discussing. This is what makes
 * "Peki ödemeler ne durumda?" implicitly refer to "Arsuz Modern Villa".
 */
export function extractPriorProject(
  messages: Array<{ role: string; content: string }>,
  projectNames: Array<{ id: string; name: string }>,
): string | null {
  if (!messages?.length || !projectNames.length) return null;
  const candidates: EntityCandidate[] = projectNames.map(p => ({ id: p.id, name: p.name }));
  // Skip the last user turn — the caller already checked it. Look back
  // through the previous 8 turns, newest first.
  const recent = messages.slice(0, -1).slice(-8).reverse();
  for (const m of recent) {
    if (!m || typeof m.content !== "string" || !m.content.trim()) continue;
    const outcome = resolveEntity(m.content, candidates, {
      autoSelectThreshold: 0.85,
      suggestThreshold: 0.72,
    });
    if (outcome.status === "auto") return outcome.match.name;
  }
  return null;
}
