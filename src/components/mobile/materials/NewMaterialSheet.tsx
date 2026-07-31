import { useMemo, useState } from "react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { MobileSelectorSheet, type SelectorOption } from "@/components/mobile/sheets/MobileSelectorSheet";
import { MobileConfirmSheet } from "@/components/mobile/sheets/MobileConfirmSheet";
import { FormFooter, SelectorField, TextField, TextAreaField } from "./fieldKit";

const UNITS = ["m³", "m²", "m", "ton", "kg", "adet", "litre", "çuval", "paket"];

interface Props {
  open: boolean;
  onClose: () => void;
  projectName: string;
  busy?: boolean;
  initialName?: string;
  onSubmit: (v: { name: string; unit: string; min_stock: number }) => void;
}

/** SPRINT 41B — focused “Yeni Malzeme Tanımla” form sheet (existing schema only). */
export function NewMaterialSheet({ open, onClose, projectName, busy, initialName = "", onSubmit }: Props) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState("kg");
  const [minStock, setMinStock] = useState("");
  const [more, setMore] = useState(false);
  const [unitPicker, setUnitPicker] = useState(false);
  const [discard, setDiscard] = useState(false);

  const dirty = name.trim().length > 0 || minStock.trim().length > 0;
  const valid = name.trim().length >= 2;

  const unitOptions: SelectorOption[] = useMemo(() => UNITS.map(u => ({ id: u, label: u })), []);

  const reset = () => { setName(""); setUnit("kg"); setMinStock(""); setMore(false); };
  const close = () => { reset(); onClose(); };

  return (
    <>
      <MobileSheet
        open={open}
        onOpenChange={(v) => { if (!v) { dirty ? setDiscard(true) : close(); } }}
        title="Yeni Malzeme Tanımla"
        description="Bu projede takip edeceğiniz yeni bir stok kartı oluşturun."
        variant="form"
        guardClose={dirty}
        onGuardedClose={() => setDiscard(true)}
        footer={
          <FormFooter
            onCancel={() => (dirty ? setDiscard(true) : close())}
            onSubmit={() => onSubmit({ name: name.trim(), unit, min_stock: Number(minStock) || 0 })}
            submitLabel="Malzemeyi Oluştur"
            disabled={!valid}
            busy={busy}
          />
        }
      >
        <div className="flex flex-col gap-4 pb-4">
          <TextField
            label="Malzeme adı"
            required
            value={name}
            onChange={setName}
            placeholder="Çimento, İnşaat demiri…"
            error={name.length > 0 && name.trim().length < 2 ? "En az 2 karakter girin." : null}
          />
          <SelectorField label="Birim" required value={unit} placeholder="Birim seçin" onOpen={() => setUnitPicker(true)} />
          <SelectorField label="Depo / Proje" value={projectName} placeholder="—" onOpen={() => {}} hint="Stok kartı seçili projeye tanımlanır." />

          {!more ? (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="self-start text-[14px] font-medium text-primary py-2"
            >
              Daha Fazla Bilgi
            </button>
          ) : (
            <TextField
              label="Minimum stok seviyesi"
              value={minStock}
              onChange={setMinStock}
              inputMode="decimal"
              placeholder="0"
              suffix={unit}
            />
          )}
        </div>
      </MobileSheet>

      <MobileSelectorSheet
        open={unitPicker}
        onOpenChange={setUnitPicker}
        title="Birim Seç"
        options={unitOptions}
        value={unit}
        onSelect={setUnit}
        searchPlaceholder="Birim ara"
      />

      <MobileConfirmSheet
        open={discard}
        onOpenChange={setDiscard}
        title="Formdan çıkılsın mı?"
        description="Girdiğiniz malzeme bilgileri kaydedilmeden silinecek."
        confirmLabel="Çık ve sil"
        cancelLabel="Formda kal"
        tone="danger"
        onConfirm={() => { setDiscard(false); close(); }}
      />
    </>
  );
}

export default NewMaterialSheet;
