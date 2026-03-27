import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ── Constants ──────────────────────────────────────────

const ILLER = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir",
  "Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli",
  "Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari",
  "Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir",
  "Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir",
  "Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat",
  "Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman",
  "Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"
];

const BUYUKSEHIRLER = [
  "Adana","Ankara","Antalya","Aydın","Balıkesir","Bursa","Denizli","Diyarbakır","Erzurum","Eskişehir",
  "Gaziantep","Hatay","İstanbul","İzmir","Kahramanmaraş","Kayseri","Kocaeli","Konya","Malatya","Manisa",
  "Mardin","Mersin","Muğla","Ordu","Sakarya","Samsun","Şanlıurfa","Tekirdağ","Trabzon","Van"
];

const TIER1 = ["İstanbul","Ankara","İzmir"];

const DEPREM_BOLGE: Record<string, string> = {
  "İstanbul":"1","Ankara":"2","İzmir":"1","Kocaeli":"1","Bursa":"1","Antalya":"2",
  "Adana":"2","Gaziantep":"1","Konya":"3","Kayseri":"3","Diyarbakır":"2","Erzurum":"2",
  "Samsun":"3","Trabzon":"3","Eskişehir":"2","Denizli":"1","Manisa":"1","Hatay":"1",
  "Van":"1","Elazığ":"1","Malatya":"1","Bingöl":"1","Muş":"1","Erzincan":"1","Tunceli":"1",
};

type Step = 1 | 2 | 3 | 4;

interface FormData {
  binaAmaci: string;
  yapiSinifi: string;
  il: string;
  yapiNizami: string;
  toplamAlan: number;
  bodrumVar: boolean;
  bodrumAlani: number;
  katSayisi: number;
  catiTipi: string;
  tasiyiciSistem: string;
  depremBolgesi: string;
  disCephe: string;
  icDuvar: string;
  zeminKaplama: string;
  pencere: string;
  camTipi: string;
  isitma: string;
  sogutma: string;
  sicakSu: string;
  asansorVar: boolean;
  asansorAdet: number;
  asansorKapasite: string;
  gunes: boolean;
  yagmur: boolean;
  akilliBina: boolean;
  peyzajAlani: number;
  peyzajKalite: string;
}

const defaultForm: FormData = {
  binaAmaci: "", yapiSinifi: "2", il: "", yapiNizami: "",
  toplamAlan: 0, bodrumVar: false, bodrumAlani: 0, katSayisi: 1, catiTipi: "",
  tasiyiciSistem: "", depremBolgesi: "", disCephe: "", icDuvar: "",
  zeminKaplama: "", pencere: "", camTipi: "",
  isitma: "", sogutma: "", sicakSu: "",
  asansorVar: false, asansorAdet: 1, asansorKapasite: "4",
  gunes: false, yagmur: false, akilliBina: false,
  peyzajAlani: 0, peyzajKalite: "Orta",
};

// ── Price constants (2025 Q1) ──────────────────────────

const P = {
  hafriyat: 450, geriDolgu: 280,
  betonC25: 4800, betonC30: 5200,
  demir: 28000, kalip: 1200,
  tugla: 850, gazbeton: 620,
  eps5: 380, eps10: 520, mantolama: 1100,
  dogalTas: 3500, kompozit: 2800, alumGiydirme: 3800,
  pvcPencere: 3200, alumPencere: 4500, ahsapPencere: 5200,
  suYalitim: 420,
  icSiva: 320, icBoya: 180,
  seramik: 650, laminat: 480, parke: 750, mermer: 1800, hali: 350,
  icKapi: 8500, banyoOrta: 45000, banyoLuks: 75000, banyoEko: 28000,
  mutfakOrta: 55000, mutfakLuks: 95000, mutfakEko: 32000,
  asmaTavan: 280,
  sihhiTesisat: 850, kombiIsitma: 1200, yerdenIsitma: 1800, isiPompasi: 2200,
  dgTesisat: 380, havalandirma: 450,
  kuvvetliAkim: 650, zayifAkim: 320, aydinlatma: 280, pano: 45000,
  asansor4: 850000, asansor6: 1100000, asansor8: 1400000, asansor13: 1900000,
  gunesPanel: 180000, yagmurSu: 120000, akilliBina: 350,
  peyzajTemel: 280, peyzajOrta: 550, peyzajLuks: 950,
  zeminEtudu: 85000,
};

// ── Calculation Engine ──────────────────────────────────

interface LineItem { kalem: string; miktar: number; birim: string; birimFiyat: number; toplam: number; }
interface CostGroup { baslik: string; items: LineItem[]; toplam: number; }

function hesapla(f: FormData): { groups: CostGroup[]; genelToplam: number } {
  const alan = f.toplamAlan || 1;
  const kat = f.katSayisi || 1;
  const katAlani = alan / kat;
  const bodrumA = f.bodrumVar ? (f.bodrumAlani || katAlani) : 0;
  const toplamBrut = alan + bodrumA;
  const cepheUzunlugu = Math.sqrt(katAlani) * 4;
  const cepheAlani = cepheUzunlugu * kat * 3;
  const daire = f.binaAmaci.includes("Konut") ? Math.max(1, Math.floor(katAlani / 120)) * kat : Math.max(1, Math.floor(katAlani / 200)) * kat;

  const ilK = TIER1.includes(f.il) ? 1.15 : BUYUKSEHIRLER.includes(f.il) ? 1.05 : 1.0;
  const sinifK = f.yapiSinifi === "1" ? 1.35 : f.yapiSinifi === "3" ? 0.78 : 1.0;
  const k = ilK * sinifK;

  const betonFiyat = f.yapiSinifi === "1" ? P.betonC30 : P.betonC25;
  const hafriyatM3 = (katAlani + bodrumA) * 2.5;
  const temelBetonM3 = katAlani * 0.6;
  const temelDemirTon = temelBetonM3 * 0.12;
  const bodrumPerdeM3 = bodrumA > 0 ? Math.sqrt(bodrumA) * 4 * 3 * 0.3 : 0;
  const kolonBetonM3 = toplamBrut * 0.04;
  const kirisBetonM3 = toplamBrut * 0.035;
  const dosemeBetonM3 = toplamBrut * 0.15;
  const kalipM2 = toplamBrut * 1.8;
  const duvarM2 = toplamBrut * 0.6;
  const duvarFiyat = f.tasiyiciSistem === "Yığma tuğla" ? P.tugla : (f.yapiSinifi === "3" ? P.gazbeton : P.tugla);
  const catiM2 = katAlani * 1.1;
  const catiFiyat = f.catiTipi === "Düz" ? 450 : f.catiTipi === "Teras" ? 850 : 650;

  const g1: LineItem[] = [
    { kalem: "Hafriyat ve kazı", miktar: Math.round(hafriyatM3), birim: "m³", birimFiyat: P.hafriyat, toplam: 0 },
    { kalem: "Geri dolgu", miktar: Math.round(hafriyatM3 * 0.3), birim: "m³", birimFiyat: P.geriDolgu, toplam: 0 },
    { kalem: `Temel betonu ${f.yapiSinifi === "1" ? "C30/37" : "C25/30"}`, miktar: +temelBetonM3.toFixed(1), birim: "m³", birimFiyat: betonFiyat, toplam: 0 },
    { kalem: "Temel demiri", miktar: +temelDemirTon.toFixed(2), birim: "ton", birimFiyat: P.demir, toplam: 0 },
  ];
  if (bodrumA > 0) g1.push({ kalem: "Bodrum perde betonu", miktar: +bodrumPerdeM3.toFixed(1), birim: "m³", birimFiyat: betonFiyat, toplam: 0 });
  g1.push(
    { kalem: "Kolon betonu", miktar: +kolonBetonM3.toFixed(1), birim: "m³", birimFiyat: betonFiyat, toplam: 0 },
    { kalem: "Kiriş betonu", miktar: +kirisBetonM3.toFixed(1), birim: "m³", birimFiyat: betonFiyat, toplam: 0 },
    { kalem: "Döşeme betonu", miktar: +dosemeBetonM3.toFixed(1), birim: "m³", birimFiyat: betonFiyat, toplam: 0 },
    { kalem: "Kalıp imalatı", miktar: Math.round(kalipM2), birim: "m²", birimFiyat: P.kalip, toplam: 0 },
    { kalem: "Tuğla/Gazbeton duvar", miktar: Math.round(duvarM2), birim: "m²", birimFiyat: duvarFiyat, toplam: 0 },
    { kalem: "Çatı imalatı", miktar: Math.round(catiM2), birim: "m²", birimFiyat: catiFiyat, toplam: 0 },
  );
  g1.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 2. DIŞ CEPHE
  const yalitimFiyat = f.yapiSinifi === "1" ? P.eps10 : P.eps5;
  const cepheFiyat = f.disCephe === "Doğal taş" ? P.dogalTas : f.disCephe === "Kompozit panel" ? P.kompozit : f.disCephe === "Alüminyum giydirme" ? P.alumGiydirme : P.mantolama;
  const pencereFiyat = f.pencere === "Alüminyum" ? P.alumPencere : f.pencere === "Ahşap" ? P.ahsapPencere : P.pvcPencere;
  const pencereAlani = cepheAlani * 0.25;
  const kapAlani = cepheAlani - pencereAlani;
  const g2: LineItem[] = [
    { kalem: "Isı yalıtımı", miktar: Math.round(cepheAlani), birim: "m²", birimFiyat: yalitimFiyat, toplam: 0 },
    { kalem: "Su yalıtımı (temel+çatı)", miktar: Math.round(katAlani * 2 + (bodrumA > 0 ? Math.sqrt(bodrumA) * 4 * 3 : 0)), birim: "m²", birimFiyat: P.suYalitim, toplam: 0 },
    { kalem: `Dış cephe kaplama (${f.disCephe || "Mantolama"})`, miktar: Math.round(kapAlani), birim: "m²", birimFiyat: cepheFiyat, toplam: 0 },
    { kalem: `Pencere doğrama (${f.pencere || "PVC"})`, miktar: Math.round(pencereAlani), birim: "m²", birimFiyat: pencereFiyat, toplam: 0 },
    { kalem: "Dış kapılar", miktar: Math.max(1, Math.ceil(daire / kat)), birim: "adet", birimFiyat: 12000, toplam: 0 },
  ];
  g2.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 3. İÇ İMALATLAR
  const zeminFiyat = f.zeminKaplama === "Mermer" ? P.mermer : f.zeminKaplama === "Laminat" ? P.laminat : f.zeminKaplama === "Parke" ? P.parke : f.zeminKaplama === "Halı" ? P.hali : P.seramik;
  const banyoFiyat = f.yapiSinifi === "1" ? P.banyoLuks : f.yapiSinifi === "3" ? P.banyoEko : P.banyoOrta;
  const mutfakFiyat = f.yapiSinifi === "1" ? P.mutfakLuks : f.yapiSinifi === "3" ? P.mutfakEko : P.mutfakOrta;
  const g3: LineItem[] = [
    { kalem: "İç sıva", miktar: Math.round(toplamBrut * 2.5), birim: "m²", birimFiyat: P.icSiva, toplam: 0 },
    { kalem: "İç boya (2 kat)", miktar: Math.round(toplamBrut * 2.5), birim: "m²", birimFiyat: P.icBoya, toplam: 0 },
    { kalem: `Zemin kaplaması (${f.zeminKaplama || "Seramik"})`, miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: zeminFiyat, toplam: 0 },
    { kalem: "İç kapılar", miktar: daire * 4, birim: "adet", birimFiyat: P.icKapi, toplam: 0 },
    { kalem: "Mutfak dolabı", miktar: daire, birim: "adet", birimFiyat: mutfakFiyat, toplam: 0 },
    { kalem: "Banyo-WC komple", miktar: Math.ceil(daire * 1.5), birim: "adet", birimFiyat: banyoFiyat, toplam: 0 },
    { kalem: "Asma tavan", miktar: Math.round(toplamBrut * 0.4), birim: "m²", birimFiyat: P.asmaTavan, toplam: 0 },
  ];
  g3.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 4. MEKANİK
  const isitmaBirim = f.isitma === "Yerden ısıtma" ? P.yerdenIsitma : f.isitma === "Isı pompası" ? P.isiPompasi : P.kombiIsitma;
  const g4: LineItem[] = [
    { kalem: "Sıhhi tesisat", miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: P.sihhiTesisat, toplam: 0 },
    { kalem: `Isıtma sistemi (${f.isitma || "Kombi"})`, miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: isitmaBirim, toplam: 0 },
    { kalem: "Havalandırma", miktar: Math.round(toplamBrut * 0.3), birim: "m²", birimFiyat: P.havalandirma, toplam: 0 },
    { kalem: "Doğalgaz tesisatı", miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: P.dgTesisat, toplam: 0 },
  ];
  g4.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 5. ELEKTRİK
  const g5: LineItem[] = [
    { kalem: "Kuvvetli akım", miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: P.kuvvetliAkim, toplam: 0 },
    { kalem: "Zayıf akım", miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: P.zayifAkim, toplam: 0 },
    { kalem: "Aydınlatma", miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: P.aydinlatma, toplam: 0 },
    { kalem: "Pano ve dağıtım", miktar: Math.max(1, Math.ceil(toplamBrut / 500)), birim: "adet", birimFiyat: P.pano, toplam: 0 },
  ];
  g5.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 6. ASANSÖR VE ÖZEL
  const g6: LineItem[] = [];
  if (f.asansorVar) {
    const asFiyat = f.asansorKapasite === "6" ? P.asansor6 : f.asansorKapasite === "8" ? P.asansor8 : f.asansorKapasite === "13" ? P.asansor13 : P.asansor4;
    g6.push({ kalem: `Asansör (${f.asansorKapasite} kişilik)`, miktar: f.asansorAdet, birim: "adet", birimFiyat: asFiyat, toplam: 0 });
  }
  if (f.gunes) g6.push({ kalem: "Güneş enerjisi paneli", miktar: 1, birim: "sistem", birimFiyat: P.gunesPanel * Math.ceil(toplamBrut / 500), toplam: 0 });
  if (f.yagmur) g6.push({ kalem: "Yağmur suyu geri kazanımı", miktar: 1, birim: "sistem", birimFiyat: P.yagmurSu, toplam: 0 });
  if (f.akilliBina) g6.push({ kalem: "Akıllı bina sistemi", miktar: Math.round(toplamBrut), birim: "m²", birimFiyat: P.akilliBina, toplam: 0 });
  g6.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 7. DIŞ SAHA
  const peyzajBirim = f.peyzajKalite === "Lüks" ? P.peyzajLuks : f.peyzajKalite === "Temel" ? P.peyzajTemel : P.peyzajOrta;
  const peyzajA = f.peyzajAlani || katAlani * 0.5;
  const g7: LineItem[] = [
    { kalem: "Çevre düzenleme", miktar: Math.round(peyzajA * 0.4), birim: "m²", birimFiyat: peyzajBirim, toplam: 0 },
    { kalem: "Yol ve parke taşı", miktar: Math.round(peyzajA * 0.3), birim: "m²", birimFiyat: 380, toplam: 0 },
    { kalem: "Çevre duvarı", miktar: Math.round(Math.sqrt(peyzajA) * 4), birim: "m", birimFiyat: 1200, toplam: 0 },
  ];
  g7.forEach(i => i.toplam = Math.round(i.miktar * i.birimFiyat * k));

  // 8. PROJE
  const insaatToplam = [g1,g2,g3,g4,g5,g6,g7].reduce((s,g) => s + g.reduce((a,i) => a+i.toplam, 0), 0);
  const g8: LineItem[] = [
    { kalem: "Mimari proje (%1.5)", miktar: 1, birim: "kalem", birimFiyat: Math.round(insaatToplam * 0.015), toplam: 0 },
    { kalem: "Statik proje (%0.8)", miktar: 1, birim: "kalem", birimFiyat: Math.round(insaatToplam * 0.008), toplam: 0 },
    { kalem: "Mekanik proje (%0.5)", miktar: 1, birim: "kalem", birimFiyat: Math.round(insaatToplam * 0.005), toplam: 0 },
    { kalem: "Elektrik proje (%0.5)", miktar: 1, birim: "kalem", birimFiyat: Math.round(insaatToplam * 0.005), toplam: 0 },
    { kalem: "Yapı denetim (%1.0)", miktar: 1, birim: "kalem", birimFiyat: Math.round(insaatToplam * 0.01), toplam: 0 },
    { kalem: "Zemin etüdü", miktar: 1, birim: "kalem", birimFiyat: P.zeminEtudu, toplam: 0 },
  ];
  g8.forEach(i => { i.toplam = i.birimFiyat; });

  const allGroups: CostGroup[] = [
    { baslik: "1. KABA İNŞAAT", items: g1, toplam: g1.reduce((a,i) => a+i.toplam, 0) },
    { baslik: "2. DIŞ CEPHE VE YALITIM", items: g2, toplam: g2.reduce((a,i) => a+i.toplam, 0) },
    { baslik: "3. İÇ İMALATLAR", items: g3, toplam: g3.reduce((a,i) => a+i.toplam, 0) },
    { baslik: "4. MEKANİK TESİSAT", items: g4, toplam: g4.reduce((a,i) => a+i.toplam, 0) },
    { baslik: "5. ELEKTRİK TESİSATI", items: g5, toplam: g5.reduce((a,i) => a+i.toplam, 0) },
  ];
  if (g6.length > 0) allGroups.push({ baslik: "6. ASANSÖR VE ÖZEL SİSTEMLER", items: g6, toplam: g6.reduce((a,i) => a+i.toplam, 0) });
  allGroups.push(
    { baslik: "7. DIŞ SAHA VE PEYZAJ", items: g7, toplam: g7.reduce((a,i) => a+i.toplam, 0) },
    { baslik: "8. PROJE VE DANIŞMANLIK", items: g8, toplam: g8.reduce((a,i) => a+i.toplam, 0) },
  );

  const genelToplam = allGroups.reduce((a,g) => a + g.toplam, 0);
  return { groups: allGroups, genelToplam };
}

// ── Helpers ──────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("tr-TR");

const COLORS = ["#E8590C","#2563EB","#16A34A","#9333EA","#DC2626","#0891B2","#CA8A04","#6366F1"];

// ── Component ───────────────────────────────────────────

const ConstructionCostCalculator = () => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({ ...defaultForm });

  const upd = (patch: Partial<FormData>) => setForm(prev => ({ ...prev, ...patch }));

  const result = useMemo(() => step === 4 ? hesapla(form) : null, [step, form]);

  const kabaInsaat = result ? result.groups.find(g => g.baslik.includes("KABA"))?.toplam || 0 : 0;
  const inceIsler = result ? (result.genelToplam - kabaInsaat) : 0;

  // Step indicator
  const steps = ["Bina Bilgileri","Yapı Özellikleri","Sistemler","Sonuç"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            Çevre ve Şehircilik Bakanlığı 2025 yılı yapı yaklaşık birim maliyetleri esas alınmıştır.
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">🕐 Son güncelleme: Q1 2025</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              i + 1 === step ? "bg-accent text-accent-foreground" :
              i + 1 < step ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            }`}>
              {i + 1 < step ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`hidden sm:inline ${i + 1 === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < 3 && <span className="text-muted-foreground mx-1">→</span>}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Bina kullanım amacı</Label>
            <Select value={form.binaAmaci} onValueChange={v => upd({ binaAmaci: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Konut - Villa","Konut - Apartman","Ticari - Ofis","Ticari - AVM","Endüstriyel - Depo","Eğitim","Sağlık","Karma"].map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Yapı sınıfı</Label>
            <RadioGroup value={form.yapiSinifi} onValueChange={v => upd({ yapiSinifi: v })} className="flex flex-wrap gap-4">
              {[{v:"1",l:"1. Sınıf — Lüks"},{v:"2",l:"2. Sınıf — Orta-üst"},{v:"3",l:"3. Sınıf — Ekonomik"}].map(o => (
                <div key={o.v} className="flex items-center gap-2">
                  <RadioGroupItem value={o.v} id={`sinif-${o.v}`} />
                  <Label htmlFor={`sinif-${o.v}`} className="text-xs cursor-pointer">{o.l}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>İl seçimi</Label>
            <Select value={form.il} onValueChange={v => upd({ il: v, depremBolgesi: DEPREM_BOLGE[v] || "3" })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {ILLER.map(il => <SelectItem key={il} value={il}>{il}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Yapı nizamı</Label>
            <Select value={form.yapiNizami} onValueChange={v => upd({ yapiNizami: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Ayrık","Bitişik ikiz","Bitişik sıra","Blok"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Toplam inşaat alanı (m²)</Label>
              <Input type="number" value={form.toplamAlan || ""} onChange={e => upd({ toplamAlan: +e.target.value })} placeholder="örn: 1200" />
            </div>
            <div className="space-y-2">
              <Label>Kat sayısı (1-30)</Label>
              <Input type="number" min={1} max={30} value={form.katSayisi || ""} onChange={e => upd({ katSayisi: Math.min(30, Math.max(1, +e.target.value)) })} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.bodrumVar} onCheckedChange={v => upd({ bodrumVar: v })} />
            <Label>Bodrum var</Label>
          </div>
          {form.bodrumVar && (
            <div className="space-y-2">
              <Label>Bodrum alanı (m²)</Label>
              <Input type="number" value={form.bodrumAlani || ""} onChange={e => upd({ bodrumAlani: +e.target.value })} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Çatı tipi</Label>
            <Select value={form.catiTipi} onValueChange={v => upd({ catiTipi: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Düz","Beşik","Teras"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setStep(2)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Devam →</Button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Taşıyıcı sistem</Label>
            <Select value={form.tasiyiciSistem} onValueChange={v => upd({ tasiyiciSistem: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Betonarme karkas","Çelik karkas","Yığma tuğla","Prefabrik","Ahşap"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Deprem bölgesi</Label>
            <Select value={form.depremBolgesi} onValueChange={v => upd({ depremBolgesi: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["1","2","3","4"].map(o => <SelectItem key={o} value={o}>{o}. derece</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dış cephe kaplaması</Label>
            <Select value={form.disCephe} onValueChange={v => upd({ disCephe: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Sıva+boya","Mantolama","Kompozit panel","Doğal taş","Alüminyum giydirme"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>İç duvar</Label>
            <Select value={form.icDuvar} onValueChange={v => upd({ icDuvar: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Sıva+boya","Alçıpan","Dekoratif sıva"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Zemin kaplaması</Label>
            <Select value={form.zeminKaplama} onValueChange={v => upd({ zeminKaplama: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Seramik","Laminat","Parke","Mermer","Halı"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pencere</Label>
              <Select value={form.pencere} onValueChange={v => upd({ pencere: v })}>
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  {["PVC","Alüminyum","Ahşap"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cam tipi</Label>
              <Select value={form.camTipi} onValueChange={v => upd({ camTipi: v })}>
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  {["Isıcam çift","Üçlü cam","Tekli cam"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Geri</Button>
            <Button onClick={() => setStep(3)} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Devam →</Button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Isıtma</Label>
            <Select value={form.isitma} onValueChange={v => upd({ isitma: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Doğalgaz kombi","Merkezi doğalgaz","Yerden ısıtma","Isı pompası","Elektrikli","Kömür"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Soğutma</Label>
            <Select value={form.sogutma} onValueChange={v => upd({ sogutma: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Yok","Split klima","VRF","Chiller"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sıcak su</Label>
            <Select value={form.sicakSu} onValueChange={v => upd({ sicakSu: v })}>
              <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
              <SelectContent>
                {["Kombiden","Merkezi","Güneş enerjili","Elektrikli"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.asansorVar} onCheckedChange={v => upd({ asansorVar: v })} />
            <Label>Asansör</Label>
          </div>
          {form.asansorVar && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Adet</Label>
                <Input type="number" min={1} value={form.asansorAdet} onChange={e => upd({ asansorAdet: Math.max(1, +e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Kapasite</Label>
                <Select value={form.asansorKapasite} onValueChange={v => upd({ asansorKapasite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["4","6","8","13"].map(o => <SelectItem key={o} value={o}>{o} kişi</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Yeşil sistemler</Label>
            <div className="space-y-2">
              {([["gunes","Güneş enerjisi paneli"],["yagmur","Yağmur suyu geri kazanımı"],["akilliBina","Akıllı bina sistemi"]] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={form[key]} onCheckedChange={v => upd({ [key]: !!v })} />
                  <Label className="text-xs">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Peyzaj parsel alanı (m²)</Label>
              <Input type="number" value={form.peyzajAlani || ""} onChange={e => upd({ peyzajAlani: +e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Peyzaj kalitesi</Label>
              <Select value={form.peyzajKalite} onValueChange={v => upd({ peyzajKalite: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Temel","Orta","Lüks"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Geri</Button>
            <Button onClick={() => setStep(4)} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 text-base font-bold py-3">
              Hesapla
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4 — RESULTS */}
      {step === 4 && result && (
        <div className="space-y-4">
          {/* Summary box */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Toplam Tahmini İnşaat Maliyeti</p>
            <p className="text-2xl font-bold text-accent">{fmt(result.genelToplam)} ₺</p>
            <p className="text-[11px] text-muted-foreground">(KDV hariç)</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">m² birim maliyet</p>
              <p className="text-sm font-bold text-foreground">{fmt(Math.round(result.genelToplam / (form.toplamAlan || 1)))} ₺</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Kaba inşaat payı</p>
              <p className="text-sm font-bold text-foreground">%{(kabaInsaat / result.genelToplam * 100).toFixed(1)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">İnce işler payı</p>
              <p className="text-sm font-bold text-foreground">%{(inceIsler / result.genelToplam * 100).toFixed(1)}</p>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-muted-foreground">
            📌 Çevre ve Şehircilik Bakanlığı 2025 yılı yapı yaklaşık birim maliyetleri esas alınmıştır.
            Gerçek maliyet zemin koşulları ve piyasa değişimlerine göre ±%20-30 farklılık gösterebilir.
          </div>

          {/* Accordion table */}
          <Accordion type="multiple" className="space-y-1">
            {result.groups.map((group, gi) => (
              <AccordionItem key={gi} value={`g-${gi}`} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-3 py-2 text-xs font-semibold hover:no-underline">
                  <div className="flex justify-between w-full pr-2">
                    <span>{group.baslik}</span>
                    <span className="text-accent font-bold">{fmt(group.toplam)} ₺</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-1 font-medium">İş Kalemi</th>
                        <th className="text-right px-2 py-1 font-medium">Miktar</th>
                        <th className="text-right px-2 py-1 font-medium">Birim</th>
                        <th className="text-right px-2 py-1 font-medium">B.Fiyat</th>
                        <th className="text-right px-3 py-1 font-medium">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, ii) => (
                        <tr key={ii} className="border-t border-border/50">
                          <td className="px-3 py-1">{item.kalem}</td>
                          <td className="text-right px-2 py-1">{fmt(item.miktar)}</td>
                          <td className="text-right px-2 py-1">{item.birim}</td>
                          <td className="text-right px-2 py-1">{fmt(item.birimFiyat)}</td>
                          <td className="text-right px-3 py-1 font-medium">{fmt(item.toplam)}</td>
                        </tr>
                      ))}
                      <tr className="bg-accent/10 font-bold border-t">
                        <td colSpan={4} className="px-3 py-1 text-accent">Grup Toplamı</td>
                        <td className="text-right px-3 py-1 text-accent">{fmt(group.toplam)} ₺</td>
                      </tr>
                    </tbody>
                  </table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Pie chart (simple SVG) + Summary table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Maliyet Dağılımı</p>
              <svg viewBox="0 0 200 200" className="w-full max-w-[180px] mx-auto">
                {(() => {
                  let cum = 0;
                  return result.groups.map((g, i) => {
                    const pct = g.toplam / result.genelToplam;
                    const start = cum * 360;
                    cum += pct;
                    const end = cum * 360;
                    const sr = (start * Math.PI) / 180;
                    const er = (end * Math.PI) / 180;
                    const large = end - start > 180 ? 1 : 0;
                    const x1 = 100 + 80 * Math.cos(sr);
                    const y1 = 100 + 80 * Math.sin(sr);
                    const x2 = 100 + 80 * Math.cos(er);
                    const y2 = 100 + 80 * Math.sin(er);
                    return pct > 0.005 ? (
                      <path key={i} d={`M100,100 L${x1},${y1} A80,80 0 ${large},1 ${x2},${y2} Z`} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth="1" />
                    ) : null;
                  });
                })()}
              </svg>
              <div className="mt-3 space-y-1">
                {result.groups.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{g.baslik}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Özet Tablo</p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-medium">Grup</th>
                    <th className="text-right py-1 font-medium">Tutar</th>
                    <th className="text-right py-1 font-medium">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {result.groups.map((g, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-1 pr-2">{g.baslik.replace(/^\d+\.\s*/, "")}</td>
                      <td className="text-right py-1">{fmt(g.toplam)} ₺</td>
                      <td className="text-right py-1">%{(g.toplam / result.genelToplam * 100).toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2">
                    <td className="py-1">GENEL TOPLAM</td>
                    <td className="text-right py-1 text-accent">{fmt(result.genelToplam)} ₺</td>
                    <td className="text-right py-1">%100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setStep(1); setForm({ ...defaultForm }); }} variant="outline" className="text-xs">
              🔄 Yeni Hesaplama
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstructionCostCalculator;
