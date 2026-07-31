import { useMemo, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { MobileSelectorSheet, type SelectorOption } from "@/components/mobile/sheets/MobileSelectorSheet";
import { MobileConfirmSheet } from "@/components/mobile/sheets/MobileConfirmSheet";
import { FormFooter, SelectorField, SummaryCard, TextField, TextAreaField } from "./fieldKit";
import type { StockMaterialOption } from "./StockEntrySheet";

export interface StockExitValues {
  material_id: string;
  exit_date: string;
  quantity: number;
  contract_item_id: string | null;
  location: string | null;
  note: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  materials: StockMaterialOption[];
  workItems: { id: string; label: string }[];
  projectName: string;
  presetMaterialId?: string | null;
  busy?: boolean;
  fmt: (n: number) => string;
  onSubmit: (v: StockExitValues) => void;
}

/** SPRINT 41B — “Stok Çıkışı” mobile form with available-stock validation. */
export function StockExitSheet({
  open, onClose, materials, workItems, projectName, presetMaterialId, busy, fmt, onSubmit,
}: Props) {
  const [materialId, setMaterialId] = useState(presetMaterialId ?? "");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [picker, setPicker] = useState<null | "material" | "work">(null);
  const [discard, setDiscard] = useState(false);

  const material = materials.find(m => m.id === materialId) || null;
  const qtyNum = Number(qty.replace(",", "."));
  const available = material?.currentStock ?? 0;

  const qtyError =
    qty.trim() === "" ? null
    : !isFinite(qtyNum) ? "Geçerli bir miktar girin."
    : qtyNum <= 0 ? "Miktar 0’dan büyük olmalı."
    : material && qtyNum > available
      ? `Stokta yeterli miktar yok. Mevcut: ${fmt(available)} ${material.unit}`
      : null;

  const dirty = !!materialId || qty.trim() !== "" || location !== "" || note !== "";
  const valid = !!materialId && qtyNum > 0 && !qtyError && !!date;

  const materialOptions: SelectorOption[] = useMemo(
    () => materials.map(m => ({ id: m.id, label: m.name, hint: `Mevcut: ${fmt(m.currentStock)} ${m.unit}` })),
    [materials, fmt],
  );
  const workOptions: SelectorOption[] = useMemo(
    () => workItems.map(w => ({ id: w.id, label: w.label })),
    [workItems],
  );

  const reset = () => {
    setMaterialId(""); setQty(""); setLocation(""); setWorkItemId(""); setNote(""); setMore(false);
  };
  const close = () => { reset(); onClose(); };

  return (
    <>
      <MobileSheet
        open={open}
        onOpenChange={(v) => { if (!v) { dirty ? setDiscard(true) : close(); } }}
        title="Stok Çıkışı"
        description="Sahada kullanılan veya teslim edilen malzemeyi kaydedin."
        variant="form"
        guardClose={dirty}
        onGuardedClose={() => setDiscard(true)}
        footer={
          <FormFooter
            onCancel={() => (dirty ? setDiscard(true) : close())}
            onSubmit={() => onSubmit({
              material_id: materialId,
              exit_date: date,
              quantity: qtyNum,
              contract_item_id: workItemId || null,
              location: location || null,
              note: note || null,
            })}
            submitLabel="Stok Çıkışını Kaydet"
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
            hint={material ? `Kullanılabilir stok: ${fmt(available)} ${material.unit}` : undefined}
          />
          <SelectorField label="Kaynak depo / Proje" value={projectName} placeholder="—" onOpen={() => {}} />
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
          <TextField
            label="Kullanım yeri"
            value={location}
            onChange={setLocation}
            placeholder="Örn. B Blok kolon kalıbı"
          />
          <TextField label="Tarih" required type="date" value={date} onChange={setDate} />

          {!more ? (
            <button type="button" onClick={() => setMore(true)} className="self-start text-[14px] font-medium text-primary py-2">
              Daha Fazla Bilgi
            </button>
          ) : (
            <>
              {workOptions.length > 0 && (
                <SelectorField
                  label="İmalat kalemi"
                  value={workItems.find(w => w.id === workItemId)?.label}
                  placeholder="İmalat kalemi seçin"
                  onOpen={() => setPicker("work")}
                />
              )}
              <TextAreaField label="Açıklama" value={note} onChange={setNote} placeholder="Teslim alan, gerekçe…" />
            </>
          )}

          {valid && material && (
            <SummaryCard
              title="Özet"
              rows={[
                { label: "Malzeme", value: material.name, tone: "strong" },
                { label: "Miktar", value: `−${fmt(qtyNum)} ${material.unit}`, tone: "strong" },
                { label: "Kaynak depo", value: projectName },
                { label: "Kullanım yeri", value: location || "Belirtilmedi" },
                { label: "Kalan stok", value: `${fmt(available - qtyNum)} ${material.unit}` },
              ]}
            />
          )}
        </div>
      </MobileSheet>

      <MobileSelectorSheet
        open={picker === "material"}
        onOpenChange={(v) => setPicker(v ? "material" : null)}
        title="Malzeme Seç"
        description="Stoktan düşülecek malzemeyi seçin."
        options={materialOptions}
        value={materialId}
        onSelect={setMaterialId}
        searchPlaceholder="Malzeme ara"
        emptyText="Bu projede eşleşen malzeme yok."
      />

      <MobileSelectorSheet
        open={picker === "work"}
        onOpenChange={(v) => setPicker(v ? "work" : null)}
        title="İmalat Kalemi Seç"
        options={workOptions}
        value={workItemId}
        onSelect={setWorkItemId}
        searchPlaceholder="Kalem ara"
        emptyText="Bu projede iş kalemi tanımlı değil."
      />

      <MobileConfirmSheet
        open={discard}
        onOpenChange={setDiscard}
        title="Stok çıkışından çıkılsın mı?"
        description="Girdiğiniz hareket bilgileri kaydedilmeden silinecek."
        confirmLabel="Çık ve sil"
        cancelLabel="Formda kal"
        tone="danger"
        onConfirm={() => { setDiscard(false); close(); }}
      />
    </>
  );
}

export default StockExitSheet;
