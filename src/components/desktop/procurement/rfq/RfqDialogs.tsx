// RFQ dialogs: add suppliers, record quotation, request revision, confirm
// selection, score explainer, convert to order, close RFQ.
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Supplier } from "../procurementConstants";
import {
  PAYMENT_TERMS,
  TECHNICAL_LEVELS,
  fmtDate,
  fmtMoney,
  isQuotationExpired,
  quotationTotals,
  type Quotation,
  type QuotationLine,
  type RfqCurrency,
  type RfqRecord,
  type RfqSupplierEntry,
  type ScoreResult,
  type TechnicalLevel,
} from "./rfqModel";

const dateInputValue = (iso?: string) => (iso ? iso.slice(0, 10) : "");

// ── Add suppliers ──────────────────────────────────────────────────────────
export function AddSuppliersDialog({
  open,
  onOpenChange,
  rfq,
  catalog,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfq: RfqRecord;
  catalog: Supplier[];
  busy: boolean;
  onSubmit: (suppliers: Supplier[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPicked([]);
    }
  }, [open]);

  const existing = new Set(rfq.suppliers.map((s) => s.supplierId));
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return catalog
      .filter((s) => !existing.has(s.id))
      .filter(
        (s) =>
          !q ||
          s.name.toLocaleLowerCase("tr").includes(q) ||
          s.category.toLocaleLowerCase("tr").includes(q)
      )
      .slice(0, 40);
  }, [catalog, query, existing]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tedarikçi Ekle</DialogTitle>
          <DialogDescription>
            {rfq.no} · {rfq.title} teklif listesine tedarikçi ekleyin. Zaten ekli olanlar
            listelenmez.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tedarikçi veya kategori ara"
          aria-label="Tedarikçi ara"
        />

        <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
          {results.length === 0 ? (
            <p className="text-fs-sm text-muted-foreground py-6 text-center">
              Eklenebilecek tedarikçi bulunamadı.
            </p>
          ) : (
            results.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 min-h-[48px] cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={picked.includes(s.id)}
                  onCheckedChange={() => toggle(s.id)}
                  aria-label={`${s.name} seç`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-fs-sm text-foreground truncate">{s.name}</span>
                  <span className="block text-fs-xs text-muted-foreground truncate">
                    {s.category} · Performans {s.score}/100
                  </span>
                </span>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            disabled={!picked.length || busy}
            onClick={() =>
              onSubmit(catalog.filter((s) => picked.includes(s.id)))
            }
          >
            {busy ? "Ekleniyor…" : `Ekle (${picked.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Record quotation ───────────────────────────────────────────────────────
type QuotationDraft = Omit<Quotation, "version" | "submittedAt" | "recordedBy">;

export function RecordQuotationDialog({
  open,
  onOpenChange,
  rfq,
  entry,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfq: RfqRecord;
  entry: RfqSupplierEntry | null;
  busy: boolean;
  onSubmit: (draft: QuotationDraft) => void;
}) {
  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [currency, setCurrency] = useState<RfqCurrency>(rfq.currency);
  const [deliveryDays, setDeliveryDays] = useState(10);
  const [paymentTerm, setPaymentTerm] = useState<string>("30 gün");
  const [warranty, setWarranty] = useState("24 ay");
  const [technical, setTechnical] = useState<TechnicalLevel>("Tam Uygun");
  const [validUntil, setValidUntil] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entry) return;
    const prev = entry.quotation;
    setLines(
      prev?.lines.length
        ? prev.lines.map((l) => ({ ...l }))
        : [{ name: rfq.title, qty: 1, unit: "adet", unitPrice: 0 }]
    );
    setDiscount(prev?.discount ?? 0);
    setVatRate(prev?.vatRate ?? 20);
    setCurrency(prev?.currency ?? rfq.currency);
    setDeliveryDays(prev?.deliveryDays ?? 10);
    setPaymentTerm(prev?.paymentTerm ?? "30 gün");
    setWarranty(prev?.warranty ?? "24 ay");
    setTechnical(prev?.technical ?? "Tam Uygun");
    setValidUntil(dateInputValue(prev?.validUntil));
    setExclusions(prev?.exclusions ?? "");
    setNotes(prev?.notes ?? "");
    setError(null);
  }, [open, entry, rfq.title, rfq.currency]);

  const totals = useMemo(
    () => quotationTotals(lines, discount, vatRate),
    [lines, discount, vatRate]
  );

  const patchLine = (i: number, patch: Partial<QuotationLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = () => {
    if (!lines.length) return setError("Teklife en az bir kalem eklenmelidir.");
    if (lines.some((l) => !l.name.trim())) return setError("Tüm kalemlerde açıklama zorunludur.");
    if (lines.some((l) => !(l.qty > 0)))
      return setError("Miktar sıfırdan büyük olmalıdır.");
    if (lines.some((l) => l.unitPrice < 0 || Number.isNaN(l.unitPrice)))
      return setError("Birim fiyat negatif olamaz.");
    if (!(deliveryDays > 0)) return setError("Teslim süresi sıfırdan büyük olmalıdır.");
    setError(null);
    onSubmit({
      lines,
      subtotal: totals.subtotal,
      discount,
      vatRate,
      vat: totals.vat,
      total: totals.total,
      currency,
      deliveryDays,
      paymentTerm,
      warranty,
      technical,
      exclusions: exclusions.trim() || undefined,
      notes: notes.trim() || undefined,
      validUntil: validUntil ? new Date(`${validUntil}T23:59:00`).toISOString() : undefined,
    });
  };

  if (!entry) return null;
  const isRevision = !!entry.quotation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRevision ? "Revize Teklif Gir" : "Teklif Gir"} · {entry.supplierName}
          </DialogTitle>
          <DialogDescription>
            {rfq.no} · Bütçe {fmtMoney(rfq.budget, rfq.currency)} · Son tarih{" "}
            {fmtDate(rfq.deadline)}
            {isRevision ? ` · Mevcut sürüm v${entry.quotation!.version}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Kalemler</Label>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5">
                <Input
                  value={l.name}
                  onChange={(e) => patchLine(i, { name: e.target.value })}
                  placeholder="Kalem açıklaması"
                  aria-label={`Kalem ${i + 1} açıklaması`}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={l.qty}
                  onChange={(e) => patchLine(i, { qty: Number(e.target.value) })}
                  aria-label={`Kalem ${i + 1} miktarı`}
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  value={l.unit}
                  onChange={(e) => patchLine(i, { unit: e.target.value })}
                  aria-label={`Kalem ${i + 1} birimi`}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={l.unitPrice}
                  onChange={(e) => patchLine(i, { unitPrice: Number(e.target.value) })}
                  aria-label={`Kalem ${i + 1} birim fiyatı`}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  className="min-h-[40px] min-w-[40px] grid place-items-center rounded-md text-muted-foreground hover:text-red-400"
                  aria-label={`Kalem ${i + 1} sil`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((prev) => [...prev, { name: "", qty: 1, unit: "adet", unitPrice: 0 }])
            }
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Kalem Ekle
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="q-discount">İskonto</Label>
            <Input
              id="q-discount"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="q-vat">KDV %</Label>
            <Input
              id="q-vat"
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="q-delivery">Teslim (gün)</Label>
            <Input
              id="q-delivery"
              type="number"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="q-valid">Geçerlilik</Label>
            <Input
              id="q-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div>
            <Label>Para birimi</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as RfqCurrency)}>
              <SelectTrigger aria-label="Para birimi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["TRY", "USD", "EUR"] as RfqCurrency[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ödeme koşulu</Label>
            <Select value={paymentTerm} onValueChange={setPaymentTerm}>
              <SelectTrigger aria-label="Ödeme koşulu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="q-warranty">Garanti</Label>
            <Input
              id="q-warranty"
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
            />
          </div>
          <div>
            <Label>Teknik uygunluk</Label>
            <Select value={technical} onValueChange={(v) => setTechnical(v as TechnicalLevel)}>
              <SelectTrigger aria-label="Teknik uygunluk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TECHNICAL_LEVELS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="q-exclusions">Kapsam dışı</Label>
            <Textarea
              id="q-exclusions"
              rows={2}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              placeholder="Nakliye, montaj vb."
            />
          </div>
          <div>
            <Label htmlFor="q-notes">Not</Label>
            <Textarea
              id="q-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-fs-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ara toplam</span>
            <span>{fmtMoney(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">KDV ({vatRate}%)</span>
            <span>{fmtMoney(totals.vat, currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Genel toplam</span>
            <span>{fmtMoney(totals.total, currency)}</span>
          </div>
          {totals.total > rfq.budget && (
            <p className="text-fs-xs text-amber-400">
              Teklif bütçeyi {fmtMoney(totals.total - rfq.budget, currency)} aşıyor.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-fs-sm text-red-400">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Kaydediliyor…" : isRevision ? "Revize Teklifi Kaydet" : "Teklifi Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Request revision ───────────────────────────────────────────────────────
export function RequestRevisionDialog({
  open,
  onOpenChange,
  entry,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: RfqSupplierEntry | null;
  busy: boolean;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) setNote("");
  }, [open]);
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revizyon İste · {entry.supplierName}</DialogTitle>
          <DialogDescription>
            Tedarikçiden neyin güncellenmesini istediğinizi yazın. Gerekçe zorunludur ve
            teklif geçmişine işlenir.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Örn. Nakliye bedeli teklife dahil edilmeli."
          aria-label="Revizyon gerekçesi"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button disabled={!note.trim() || busy} onClick={() => onSubmit(note)}>
            {busy ? "Gönderiliyor…" : "Revizyon İste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Confirm selection ──────────────────────────────────────────────────────
export function ConfirmSelectionDialog({
  open,
  onOpenChange,
  rfq,
  entry,
  score,
  cheapestTotal,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfq: RfqRecord;
  entry: RfqSupplierEntry | null;
  score: ScoreResult | null;
  cheapestTotal: number;
  busy: boolean;
  onSubmit: (input: { reason: string; note?: string; acceptExpired: boolean }) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [acceptExpired, setAcceptExpired] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setNote("");
      setAcceptExpired(false);
    }
  }, [open]);

  if (!entry?.quotation) return null;
  const q = entry.quotation;
  const expired = isQuotationExpired(q);
  const notCheapest = cheapestTotal > 0 && q.total > cheapestTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Seçimi Onayla · {entry.supplierName}</DialogTitle>
          <DialogDescription>
            {rfq.no} · Bu seçim {rfq.title} talebi için kaydedilir ve siparişe dönüştürme
            adımını açar.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 text-fs-sm">
          <div>
            <dt className="text-muted-foreground text-fs-xs">Toplam</dt>
            <dd className="text-foreground font-semibold">{fmtMoney(q.total, q.currency)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-fs-xs">Teslim</dt>
            <dd className="text-foreground">{q.deliveryDays} gün</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-fs-xs">Ödeme</dt>
            <dd className="text-foreground">{q.paymentTerm}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-fs-xs">Puan</dt>
            <dd className="text-foreground">{score ? `${score.total}/100` : "—"}</dd>
          </div>
        </dl>

        {notCheapest && (
          <p className="text-fs-sm text-amber-400 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            Bu teklif en düşük fiyat değil. En düşük teklife göre{" "}
            {fmtMoney(q.total - cheapestTotal, q.currency)} daha yüksek — gerekçe kayda geçer.
          </p>
        )}

        {expired && (
          <label className="flex items-start gap-2 text-fs-sm text-red-300 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2">
            <Checkbox
              checked={acceptExpired}
              onCheckedChange={(v) => setAcceptExpired(v === true)}
              aria-label="Süresi geçmiş teklifi onaylıyorum"
            />
            <span>
              Teklifin geçerlilik süresi {fmtDate(q.validUntil)} tarihinde doldu. Yine de bu
              teklifle devam etmek istiyorum.
            </span>
          </label>
        )}

        <div>
          <Label htmlFor="sel-reason">Seçim gerekçesi *</Label>
          <Textarea
            id="sel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn. En yüksek toplam puan ve teknik uygunluk."
          />
        </div>
        <div>
          <Label htmlFor="sel-note">Not (opsiyonel)</Label>
          <Input id="sel-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            disabled={!reason.trim() || busy || (expired && !acceptExpired)}
            onClick={() => onSubmit({ reason, note, acceptExpired })}
          >
            {busy ? "Kaydediliyor…" : `${entry.supplierName} ile Devam Et`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Score explainer ────────────────────────────────────────────────────────
export function ScoreExplainerDialog({
  open,
  onOpenChange,
  supplierName,
  score,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplierName?: string;
  score: ScoreResult | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Puan Dökümü{supplierName ? ` · ${supplierName}` : ""}</DialogTitle>
          <DialogDescription>
            Puan, teklifler arasındaki en iyi değere göre ağırlıklı olarak hesaplanır.
          </DialogDescription>
        </DialogHeader>
        {!score ? (
          <p className="text-fs-sm text-muted-foreground">
            Bu tedarikçi için kayıtlı teklif olmadığı sürece puan hesaplanmaz.
          </p>
        ) : (
          <div className="space-y-3">
            {score.items.map((it) => (
              <div key={it.key}>
                <div className="flex items-center justify-between text-fs-sm">
                  <span className="text-foreground">
                    {it.label}{" "}
                    <span className="text-muted-foreground">(%{it.weight})</span>
                  </span>
                  <span className="text-foreground font-medium">
                    {it.earned}/{it.weight}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(it.earned / it.weight) * 100}%` }}
                  />
                </div>
                <p className="text-fs-xs text-muted-foreground mt-1">{it.note}</p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2 text-fs-sm font-semibold">
              <span>Toplam</span>
              <span>{score.total}/100</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Convert to order ───────────────────────────────────────────────────────
export function ConvertToOrderDialog({
  open,
  onOpenChange,
  rfq,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfq: RfqRecord;
  busy: boolean;
  onSubmit: (input: { etaDays: number; notes?: string }) => void;
}) {
  const selectedEntry = rfq.suppliers.find((s) => s.supplierId === rfq.selection?.supplierId);
  const [etaDays, setEtaDays] = useState(selectedEntry?.quotation?.deliveryDays ?? 7);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setEtaDays(selectedEntry?.quotation?.deliveryDays ?? 7);
      setNotes("");
    }
  }, [open, selectedEntry]);

  if (!rfq.selection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Siparişe Dönüştür</DialogTitle>
          <DialogDescription>
            {rfq.selection.supplierName} · {fmtMoney(rfq.selection.total, rfq.selection.currency)}{" "}
            tutarındaki seçili teklif siparişe dönüştürülecek.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="po-eta">Tahmini teslim (gün)</Label>
          <Input
            id="po-eta"
            type="number"
            value={etaDays}
            onChange={(e) => setEtaDays(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="po-notes">Sipariş notu</Label>
          <Textarea
            id="po-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || !(etaDays > 0)}
            onClick={() => onSubmit({ etaDays, notes })}
          >
            {busy ? "Oluşturuluyor…" : "Siparişi Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Deadline / close / generic confirm ─────────────────────────────────────
export function DeadlineDialog({
  open,
  onOpenChange,
  rfq,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rfq: RfqRecord;
  busy: boolean;
  onSubmit: (isoDate: string) => void;
}) {
  const [value, setValue] = useState(dateInputValue(rfq.deadline));
  useEffect(() => {
    if (open) setValue(dateInputValue(rfq.deadline));
  }, [open, rfq.deadline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Son Tarihi Güncelle</DialogTitle>
          <DialogDescription>
            Teklif toplama son tarihi tedarikçilere bildirilen tarihtir.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Teklif son tarihi"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            disabled={!value || busy}
            onClick={() => onSubmit(new Date(`${value}T17:00:00`).toISOString())}
          >
            {busy ? "Kaydediliyor…" : "Güncelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RfqConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busy,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "İşleniyor…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Quotation detail ───────────────────────────────────────────────────────
export function QuotationDetailDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entry: RfqSupplierEntry | null;
}) {
  if (!entry) return null;
  const q = entry.quotation;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry.supplierName}</DialogTitle>
          <DialogDescription>
            {entry.category} · Performans {entry.performance}/100 · Durum {entry.status}
          </DialogDescription>
        </DialogHeader>

        {!q ? (
          <p className="text-fs-sm text-muted-foreground">
            Bu tedarikçi için henüz teklif kaydedilmedi.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              {q.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3 text-fs-sm">
                  <span className="text-foreground truncate">
                    {l.name}{" "}
                    <span className="text-muted-foreground">
                      · {l.qty} {l.unit}
                    </span>
                  </span>
                  <span className="text-foreground whitespace-nowrap">
                    {fmtMoney(l.qty * l.unitPrice, q.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-fs-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ara toplam</span>
                <span>{fmtMoney(q.subtotal, q.currency)}</span>
              </div>
              {q.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">İskonto</span>
                  <span>-{fmtMoney(q.discount, q.currency)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">KDV ({q.vatRate}%)</span>
                <span>{fmtMoney(q.vat, q.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Genel toplam</span>
                <span>{fmtMoney(q.total, q.currency)}</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-fs-sm">
              <div>
                <dt className="text-fs-xs text-muted-foreground">Teslim</dt>
                <dd>{q.deliveryDays} gün</dd>
              </div>
              <div>
                <dt className="text-fs-xs text-muted-foreground">Ödeme</dt>
                <dd>{q.paymentTerm}</dd>
              </div>
              <div>
                <dt className="text-fs-xs text-muted-foreground">Garanti</dt>
                <dd>{q.warranty}</dd>
              </div>
              <div>
                <dt className="text-fs-xs text-muted-foreground">Teknik uygunluk</dt>
                <dd>{q.technical}</dd>
              </div>
              <div>
                <dt className="text-fs-xs text-muted-foreground">Geçerlilik</dt>
                <dd className={cn(isQuotationExpired(q) && "text-red-400")}>
                  {fmtDate(q.validUntil)}
                </dd>
              </div>
              <div>
                <dt className="text-fs-xs text-muted-foreground">Sürüm</dt>
                <dd>v{q.version}</dd>
              </div>
            </dl>
            {q.exclusions && (
              <p className="text-fs-sm text-muted-foreground">
                <span className="text-foreground">Kapsam dışı: </span>
                {q.exclusions}
              </p>
            )}
            {q.notes && (
              <p className="text-fs-sm text-muted-foreground">
                <span className="text-foreground">Not: </span>
                {q.notes}
              </p>
            )}
            {entry.revisions.length > 0 && (
              <div>
                <p className="text-fs-sm text-foreground mb-1">Önceki sürümler</p>
                <ul className="space-y-1">
                  {entry.revisions.map((r) => (
                    <li key={r.version} className="text-fs-xs text-muted-foreground">
                      v{r.version} · {fmtMoney(r.total, r.currency)} · {fmtDate(r.submittedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {entry.messages.length > 0 && (
          <div>
            <p className="text-fs-sm text-foreground mb-1">Yazışma geçmişi</p>
            <ul className="space-y-1">
              {entry.messages.map((m, i) => (
                <li key={i} className="text-fs-xs text-muted-foreground">
                  {fmtDate(m.at)} · {m.actor}: {m.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" /> Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
