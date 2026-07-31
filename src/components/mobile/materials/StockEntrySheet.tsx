import { useMemo, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { MobileSelectorSheet, type SelectorOption } from "@/components/mobile/sheets/MobileSelectorSheet";
import { MobileConfirmSheet } from "@/components/mobile/sheets/MobileConfirmSheet";
import { FormFooter, SelectorField, SummaryCard, TextField, TextAreaField } from "./fieldKit";

export interface StockMaterialOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}

export interface StockEntryValues {
  material_id: string;
  entry_date: string;
  quantity: number;
  unit_price: number;
  supplier: string;
  waybill_no: string | null;
  note: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  materials: StockMaterialOption[];
  suppliers: string[];
  projectName: string;
  presetMaterialId?: string | null;
  busy?: boolean;
  fmt: (n: number) => string;
  fmtMoney: (n: number) => string;
  onCreateMaterial: (query: string) => void;
  onSubmit: (v: StockEntryValues) => void;
}

/** SPRINT 41B — “Stok Girişi” mobile form: material → warehouse → quantity → commercial details → review. */
export function StockEntrySheet({
  open, onClose, materials, suppliers, projectName, presetMaterialId,
  busy, fmt, fmtMoney, onCreateMaterial, onSubmit,
}: Props) {
  const [materialId, setMaterialId] = useState(presetMaterialId ?? "");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [price, setPrice] = useState("");
  const [waybill, setWaybill] = useState("");
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [picker, setPicker] = useState<null | "material" | "supplier">(null);
  const [discard, setDiscard] = useState(false);

  const material = materials.find(m => m.id === materialId) || null;
  const qtyNum = Number(qty.replace(",", "."));
  const priceNum = Number(price.replace(",", ".")) || 0;

  const qtyError =
    qty.trim() === "" ? null
    : !isFinite(qtyNum) ? "Geçerli bir miktar girin."
    : qtyNum <= 0 ? "Miktar 0’dan büyük olmalı."
    : null;

  const dirty = !!materialId || qty.trim() !== "" || supplier !== "" || note !== "";
  const valid = !!materialId && qtyNum > 0 && !qtyError && !!date;

  const materialOptions: SelectorOption[] = useMemo(
    () => materials.map(m => ({ id: m.id, label: m.name, hint: `Mevcut: ${fmt(m.currentStock)} ${m.unit}` })),
    [materials, fmt],
  );
  const supplierOptions: SelectorOption[] = useMemo(
    () => suppliers.map(s => ({ id: s, label: s })),
    [suppliers],
  );

  const reset = () => {
    setMaterialId(""); setQty(""); setSupplier(""); setPrice(""); setWaybill(""); setNote(""); setMore(false);
  };
  const close = () => { reset(); onClose(); };

  return (
    <>
      <MobileSheet
        open={open}
        onOpenChange={(v) => { if (!v) { dirty ? setDiscard(true) : close(); } }}
        title="Stok Girişi"
        description="Satın alınan veya teslim alınan malzemeyi stoğa ekleyin."
        variant="form"
        guardClose={dirty}
        onGuardedClose={() => setDiscard(true)}
        footer={
          <FormFooter
            onCancel={() => (dirty ? setDiscard(true) : close())}
            onSubmit={() => onSubmit({
              material_id: materialId,
              entry_date: date,
              quantity: qtyNum,
              unit_price: priceNum,
              supplier,
              waybill_no: waybill || null,
              note: note || null,
            })}
            submitLabel="Stok Girişi Kaydet"
            disabled={!valid}
            busy={busy}
          />
        }
      >
        <div className="flex flex-col gap-4 pb-4">
          <SelectorField
            label="Malzeme"
            required
            value={material?.name}
            placeholder="Malzeme seçin"
            onOpen={() => setPicker("material")}
            hint={material ? `Mevcut stok: ${fmt(material.currentStock)} ${material.unit}` : undefined}
          />
          <SelectorField label="Depo / Proje" value={projectName} placeholder="—" onOpen={() => {}} />
          <TextField
            label="Miktar"
            required
            value={qty}
            onChange={setQty}
            inputMode="decimal"
            placeholder="0"
            suffix={material?.unit}
            error={qtyError}
          />
          <TextField label="Tarih" required type="date" value={date} onChange={setDate} />

          {!more ? (
            <button type="button" onClick={() => setMore(true)} className="self-start text-[14px] font-medium text-primary py-2">
              Daha Fazla Bilgi
            </button>
          ) : (
            <>
              <SelectorField
                label="Tedarikçi"
                value={supplier}
                placeholder="Tedarikçi seçin veya ekleyin"
                onOpen={() => setPicker("supplier")}
              />
              <TextField label="Birim fiyat" value={price} onChange={setPrice} inputMode="decimal" placeholder="0" suffix="₺" />
              <TextField label="İrsaliye no" value={waybill} onChange={setWaybill} placeholder="Örn. 2026/1187" />
              <TextAreaField label="Açıklama" value={note} onChange={setNote} placeholder="Kısa bir not…" />
            </>
          )}

          {valid && material && (
            <SummaryCard
              title="Özet"
              rows={[
                { label: "Malzeme", value: material.name, tone: "strong" },
                { label: "Miktar", value: `+${fmt(qtyNum)} ${material.unit}`, tone: "strong" },
                { label: "Hedef depo", value: projectName },
                ...(priceNum > 0
                  ? [{ label: "Toplam tutar", value: fmtMoney(qtyNum * priceNum), tone: "strong" as const }]
                  : []),
                { label: "Yeni stok", value: `${fmt(material.currentStock + qtyNum)} ${material.unit}` },
              ]}
            />
          )}
        </div>
      </MobileSheet>

      <MobileSelectorSheet
        open={picker === "material"}
        onOpenChange={(v) => setPicker(v ? "material" : null)}
        title="Malzeme Seç"
        description="Stoğa girecek malzemeyi seçin."
        options={materialOptions}
        value={materialId}
        onSelect={setMaterialId}
        searchPlaceholder="Malzeme ara"
        createLabel="Yeni malzeme tanımla"
        onCreate={(q) => { setPicker(null); onCreateMaterial(q); }}
        emptyText="Bu projede eşleşen malzeme yok."
      />

      <MobileSelectorSheet
        open={picker === "supplier"}
        onOpenChange={(v) => setPicker(v ? "supplier" : null)}
        title="Tedarikçi Seç"
        options={supplierOptions}
        value={supplier}
        onSelect={setSupplier}
        searchPlaceholder="Tedarikçi ara"
        createLabel="Bu adı kullan"
        onCreate={(q) => { if (q) setSupplier(q); setPicker(null); }}
        emptyText="Kayıtlı tedarikçi yok — arama alanına yazıp ekleyebilirsiniz."
      />

      <MobileConfirmSheet
        open={discard}
        onOpenChange={setDiscard}
        title="Stok girişinden çıkılsın mı?"
        description="Girdiğiniz hareket bilgileri kaydedilmeden silinecek."
        confirmLabel="Çık ve sil"
        cancelLabel="Formda kal"
        tone="danger"
        onConfirm={() => { setDiscard(false); close(); }}
      />
    </>
  );
}

export default StockEntrySheet;
