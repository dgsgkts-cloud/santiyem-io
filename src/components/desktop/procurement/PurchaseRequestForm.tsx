// PurchaseRequestForm — the single form used for BOTH creating and editing a
// purchase request (mode: "create" | "edit"). Validation, item rows, attachment
// handling and totals are shared; only the header copy and the submit mutation
// differ. Rendered as a full page inside the procurement shell, driven by URL
// params (?talep=<id>&duzenle=1) so direct links, refresh and browser
// back/forward all work.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CATS, PRIORITIES, fmtTRY, type Request } from "./procurementConstants";
import {
  CURRENCIES,
  MAX_FILE_MB,
  UNITS,
  blankForm,
  emptyItem,
  formToRequestPatch,
  itemTotal,
  itemsTotal,
  requestToForm,
  validateFile,
  validateRequestForm,
  type RequestFormErrors,
  type RequestFormValues,
} from "./requestFormSchema";
import {
  DeleteDraftDialog,
  StaleRequestDialog,
  UnsavedChangesDialog,
} from "./RequestEditDialogs";
import { EDIT_PERMISSION_MESSAGE, NOT_EDITABLE_MESSAGE, isEditableStatus } from "./procurementWorkflow";
import type { RequestWorkflow } from "./useRequestWorkflow";

interface Props {
  mode: "create" | "edit";
  request: Request | null;
  /** true while the request list is still being resolved */
  loading: boolean;
  workflow: RequestWorkflow;
  projectNames: string[];
  actor: string;
  onClose: () => void;
  onSaved: (request: Request) => void;
  onDeleted: () => void;
}

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
    <div className="mb-3">
      <h2 className="text-fs-sm font-semibold text-foreground">{title}</h2>
      {hint && <p className="text-fs-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

const FieldError = ({ id, msg }: { id: string; msg?: string }) =>
  msg ? (
    <p id={id} role="alert" className="mt-1 text-fs-xs text-red-400">
      {msg}
    </p>
  ) : null;

const FormSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-live="polite">
    <span className="sr-only">Talep bilgileri yükleniyor</span>
    {[0, 1, 2].map((i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((j) => (
            <div key={j} className="space-y-1.5">
              <div className="h-3 w-24 rounded bg-muted/70 animate-pulse" />
              <div className="h-10 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const inputCls =
  "w-full min-h-[44px] px-3 py-2 text-fs-sm rounded-lg bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF6B2B]/60";

export const PurchaseRequestForm = ({
  mode,
  request,
  loading,
  workflow,
  projectNames,
  actor,
  onClose,
  onSaved,
  onDeleted,
}: Props) => {
  const initial = useMemo<RequestFormValues | null>(() => {
    if (mode === "edit") return request ? requestToForm(request) : null;
    return blankForm({
      no: `PR-${new Date().getFullYear()}-${String(Date.now() % 9000 + 1000)}`,
      project: projectNames[0] ?? "",
      requester: actor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, request?.id, request?.version, request?.updatedAt, projectNames.join("|"), actor]);

  const [values, setValues] = useState<RequestFormValues | null>(initial);
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stale, setStale] = useState(false);
  const baselineRef = useRef<string>(JSON.stringify(initial));
  const openedVersion = useRef<number | undefined>(request?.version ?? 0);
  const openedUpdatedAt = useRef<string | undefined>(request?.updatedAt);
  const firstErrorRef = useRef<HTMLDivElement | null>(null);

  // Load data into the form once the request resolves (deep link / refresh).
  useEffect(() => {
    if (!values && initial) {
      setValues(initial);
      baselineRef.current = JSON.stringify(initial);
      openedVersion.current = request?.version ?? 0;
      openedUpdatedAt.current = request?.updatedAt;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const dirty = !!values && JSON.stringify(values) !== baselineRef.current;

  // Refresh / tab close protection — only when something actually changed.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = useCallback(<K extends keyof RequestFormValues>(key: K, v: RequestFormValues[K]) => {
    setValues((prev) => (prev ? { ...prev, [key]: v } : prev));
    setErrors((prev) => ({ ...prev, [key as string]: undefined }));
  }, []);

  const setItem = useCallback((idx: number, patch: Partial<RequestFormValues["items"][number]>) => {
    setValues((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      const autoBudget = itemsTotal(items);
      const hadAuto = itemsTotal(prev.items) === Number(prev.budget);
      return { ...prev, items, budget: hadAuto && autoBudget > 0 ? autoBudget : prev.budget };
    });
    setErrors({});
  }, []);

  const addItem = () =>
    setValues((prev) => (prev ? { ...prev, items: [...prev.items, emptyItem()] } : prev));

  const removeItem = (idx: number) => {
    setValues((prev) => {
      if (!prev) return prev;
      if (prev.items.length === 1) {
        toast.error("Talepte en az bir kalem kalmalıdır.");
        return prev;
      }
      const target = prev.items[idx];
      const meaningful = !!String(target.name || "").trim() || Number(target.qty) > 1;
      if (meaningful && !window.confirm(`"${target.name || "Bu kalem"}" kalemi çıkarılsın mı?`)) {
        return prev;
      }
      return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
    });
  };

  const moveItem = (idx: number, dir: -1 | 1) =>
    setValues((prev) => {
      if (!prev) return prev;
      const next = [...prev.items];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return { ...prev, items: next };
    });

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length || !values) return;
    const accepted: RequestFormValues["attachments"] = [];
    for (const file of Array.from(files)) {
      const err = validateFile(file);
      if (err) {
        toast.error(`${file.name}: ${err}`);
        continue;
      }
      accepted.push({
        id: `att-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      });
    }
    if (accepted.length) set("attachments", [...values.attachments, ...accepted]);
  };

  const requestLeave = () => {
    if (dirty) setConfirmLeave(true);
    else onClose();
  };

  const doSave = async () => {
    if (!values) return;
    const result = validateRequestForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      toast.error("Lütfen işaretli alanları düzeltin.");
      firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    const patch = formToRequestPatch(values);

    if (mode === "edit") {
      if (!request) {
        toast.error("Bu talep artık mevcut değil.");
        return;
      }
      setSaving(true);
      const res = await workflow.saveEdit({
        id: request.id,
        patch,
        baseVersion: openedVersion.current,
        baseUpdatedAt: openedUpdatedAt.current,
        actor,
      });
      setSaving(false);
      if (res.ok && res.request) {
        baselineRef.current = JSON.stringify(values);
        openedVersion.current = res.request.version;
        openedUpdatedAt.current = res.request.updatedAt;
        onSaved(res.request);
      } else if (res.reason === "stale") {
        setStale(true);
      }
      return;
    }

    toast.info(
      "Yeni talep oluşturma kaydı bir sonraki adımda satın alma tablosuna bağlanacak; şu an yalnızca taslak düzenleme kaydedilebiliyor."
    );
  };

  // ── states ────────────────────────────────────────────────────────────────
  if (loading && !values) {
    return (
      <div className="mx-auto w-full max-w-[1100px] space-y-4 pb-28">
        <div className="h-6 w-64 rounded bg-muted animate-pulse" />
        <FormSkeleton />
      </div>
    );
  }

  if (mode === "edit" && !request) {
    return (
      <div className="mx-auto w-full max-w-[640px] rounded-xl border border-dashed border-border p-8 text-center">
        <FileText className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
        <div className="text-fs-sm text-foreground">Talep bulunamadı.</div>
        <p className="text-fs-xs text-muted-foreground mt-1">
          Bağlantı geçersiz olabilir veya bu talep artık mevcut değil.
        </p>
        <Button onClick={onClose} className="mt-4 min-h-[44px]">
          Taleplere Dön
        </Button>
      </div>
    );
  }

  if (mode === "edit" && request && !isEditableStatus(request.status)) {
    return (
      <div className="mx-auto w-full max-w-[640px] rounded-xl border border-border bg-card p-8 text-center">
        <div className="text-fs-sm text-foreground">{NOT_EDITABLE_MESSAGE}</div>
        <p className="text-fs-xs text-muted-foreground mt-1">
          Mevcut durum: {request.status}
        </p>
        <Button onClick={onClose} className="mt-4 min-h-[44px]">
          Taleplere Dön
        </Button>
      </div>
    );
  }

  if (mode === "edit" && request && !workflow.can("edit")) {
    return (
      <div className="mx-auto w-full max-w-[640px] rounded-xl border border-border bg-card p-8 text-center">
        <div className="text-fs-sm text-foreground">{EDIT_PERMISSION_MESSAGE}</div>
        <Button onClick={onClose} className="mt-4 min-h-[44px]">
          Taleplere Dön
        </Button>
      </div>
    );
  }

  if (!values) return null;

  const total = itemsTotal(values.items);

  return (
    <div className="mx-auto w-full max-w-[1100px] pb-32 sm:pb-24">
      {/* header */}
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={requestLeave}
            className="mb-1 inline-flex items-center gap-1.5 text-fs-xs text-muted-foreground hover:text-foreground min-h-[32px]"
            aria-label="Taleplere dön"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Talepler
          </button>
          <h1 className="text-fs-lg font-semibold text-foreground">
            {mode === "edit" ? "Satın Alma Talebini Düzenle" : "Yeni Satın Alma Talebi"}
          </h1>
          <p className="text-fs-xs text-muted-foreground mt-0.5 font-mono truncate">
            {values.no} · {values.project || "Proje seçilmedi"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={requestLeave} disabled={saving} className="min-h-[44px]">
            Vazgeç
          </Button>
          <Button onClick={doSave} disabled={saving} aria-busy={saving} className="min-h-[44px]">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Değişiklikleri Kaydet
          </Button>
          {mode === "edit" && request?.status === "Taslak" && workflow.can("delete") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-h-[44px] w-11 p-0" aria-label="Diğer işlemler">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-400 focus:text-red-400"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Talebi Sil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div ref={firstErrorRef} className="space-y-4">
        <Section title="Genel Bilgiler" hint="Zorunlu alanlar * ile işaretlidir.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pr-no" className="text-fs-xs">
                Talep No
              </Label>
              <input
                id="pr-no"
                value={values.no}
                readOnly
                aria-readonly="true"
                className={cn(inputCls, "font-mono opacity-70 cursor-not-allowed")}
              />
            </div>
            <div>
              <Label htmlFor="pr-project" className="text-fs-xs">
                Proje *
              </Label>
              <select
                id="pr-project"
                value={values.project}
                onChange={(e) => set("project", e.target.value)}
                aria-invalid={!!errors.project}
                aria-describedby={errors.project ? "err-project" : undefined}
                className={inputCls}
              >
                <option value="">Proje seçin</option>
                {projectNames.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {values.project && !projectNames.includes(values.project) && (
                  <option value={values.project}>{values.project}</option>
                )}
              </select>
              <FieldError id="err-project" msg={errors.project} />
            </div>
            <div>
              <Label htmlFor="pr-requester" className="text-fs-xs">
                Talep Eden *
              </Label>
              <Input
                id="pr-requester"
                value={String(values.requester ?? "")}
                onChange={(e) => set("requester", e.target.value)}
                aria-invalid={!!errors.requester}
                className="min-h-[44px] text-fs-sm"
              />
              <FieldError id="err-requester" msg={errors.requester} />
            </div>
            <div>
              <Label htmlFor="pr-dept" className="text-fs-xs">
                Departman / Masraf Yeri
              </Label>
              <Input
                id="pr-dept"
                value={String(values.department ?? "")}
                onChange={(e) => set("department", e.target.value)}
                className="min-h-[44px] text-fs-sm"
              />
            </div>
            <div>
              <Label htmlFor="pr-needby" className="text-fs-xs">
                İhtiyaç Tarihi *
              </Label>
              <input
                id="pr-needby"
                type="date"
                value={values.needByDate}
                onChange={(e) => set("needByDate", e.target.value)}
                aria-invalid={!!errors.needByDate}
                className={inputCls}
              />
              <FieldError id="err-needby" msg={errors.needByDate} />
            </div>
            <div>
              <Label htmlFor="pr-priority" className="text-fs-xs">
                Öncelik *
              </Label>
              <select
                id="pr-priority"
                value={values.priority}
                onChange={(e) => set("priority", e.target.value as RequestFormValues["priority"])}
                className={inputCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-cat" className="text-fs-xs">
                Kategori *
              </Label>
              <select
                id="pr-cat"
                value={String(values.category ?? "")}
                onChange={(e) => set("category", e.target.value)}
                className={inputCls}
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {values.category && !CATS.includes(values.category as (typeof CATS)[number]) && (
                  <option value={String(values.category)}>{String(values.category)}</option>
                )}
              </select>
              <FieldError id="err-cat" msg={errors.category} />
            </div>
            <div>
              <Label htmlFor="pr-delivery" className="text-fs-xs">
                Teslim Yeri
              </Label>
              <Input
                id="pr-delivery"
                value={String(values.deliveryLocation ?? "")}
                onChange={(e) => set("deliveryLocation", e.target.value)}
                className="min-h-[44px] text-fs-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pr-desc" className="text-fs-xs">
                Açıklama
              </Label>
              <Textarea
                id="pr-desc"
                rows={3}
                value={String(values.description ?? "")}
                onChange={(e) => set("description", e.target.value)}
                className="text-fs-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pr-notes" className="text-fs-xs">
                Notlar
              </Label>
              <Textarea
                id="pr-notes"
                rows={2}
                value={String(values.notes ?? "")}
                onChange={(e) => set("notes", e.target.value)}
                className="text-fs-sm"
              />
            </div>
          </div>
        </Section>

        <Section
          title="Kalemler"
          hint="En az bir kalem zorunludur. Tahmini toplam miktar ve birim fiyattan otomatik hesaplanır."
        >
          <FieldError id="err-items" msg={errors.items} />
          <div className="space-y-3">
            {values.items.map((it, idx) => (
              <div key={it.key} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-fs-xs font-medium text-muted-foreground">
                    Kalem {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Kalem ${idx + 1} yukarı taşı`}
                      className="min-h-[36px] min-w-[36px] rounded-md text-fs-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === values.items.length - 1}
                      aria-label={`Kalem ${idx + 1} aşağı taşı`}
                      className="min-h-[36px] min-w-[36px] rounded-md text-fs-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      aria-label={`Kalem ${idx + 1} çıkar`}
                      className="min-h-[36px] min-w-[36px] rounded-md text-red-400 hover:bg-red-500/10 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor={`it-name-${idx}`} className="text-fs-xs">
                      Malzeme / Hizmet *
                    </Label>
                    <Input
                      id={`it-name-${idx}`}
                      value={String(it.name ?? "")}
                      onChange={(e) => setItem(idx, { name: e.target.value })}
                      aria-invalid={!!errors[`items.${idx}.name`]}
                      className="min-h-[44px] text-fs-sm"
                    />
                    <FieldError id={`err-it-name-${idx}`} msg={errors[`items.${idx}.name`]} />
                  </div>
                  <div>
                    <Label htmlFor={`it-cat-${idx}`} className="text-fs-xs">
                      Kategori *
                    </Label>
                    <select
                      id={`it-cat-${idx}`}
                      value={String(it.category ?? "")}
                      onChange={(e) => setItem(idx, { category: e.target.value })}
                      className={inputCls}
                    >
                      {CATS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor={`it-qty-${idx}`} className="text-fs-xs">
                        Miktar *
                      </Label>
                      <Input
                        id={`it-qty-${idx}`}
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={String(it.qty ?? "")}
                        onChange={(e) => setItem(idx, { qty: e.target.value })}
                        aria-invalid={!!errors[`items.${idx}.qty`]}
                        className="min-h-[44px] text-fs-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`it-unit-${idx}`} className="text-fs-xs">
                        Birim *
                      </Label>
                      <select
                        id={`it-unit-${idx}`}
                        value={String(it.unit ?? "")}
                        onChange={(e) => setItem(idx, { unit: e.target.value })}
                        className={inputCls}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                        {it.unit && !UNITS.includes(it.unit as (typeof UNITS)[number]) && (
                          <option value={String(it.unit)}>{String(it.unit)}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <FieldError id={`err-it-qty-${idx}`} msg={errors[`items.${idx}.qty`]} />
                  <div>
                    <Label htmlFor={`it-price-${idx}`} className="text-fs-xs">
                      Tahmini Birim Fiyat
                    </Label>
                    <Input
                      id={`it-price-${idx}`}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={String(it.unitPrice ?? 0)}
                      onChange={(e) =>
                        setItem(idx, { unitPrice: e.target.value })
                      }
                      aria-invalid={!!errors[`items.${idx}.unitPrice`]}
                      className="min-h-[44px] text-fs-sm"
                    />
                    <FieldError
                      id={`err-it-price-${idx}`}
                      msg={errors[`items.${idx}.unitPrice`]}
                    />
                  </div>
                  <div>
                    <Label className="text-fs-xs">Tahmini Tutar</Label>
                    <div className="min-h-[44px] flex items-center px-3 rounded-lg bg-muted/40 border border-border text-fs-sm text-foreground">
                      {fmtTRY(itemTotal(it))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`it-brand-${idx}`} className="text-fs-xs">
                      Tercih Edilen Marka
                    </Label>
                    <Input
                      id={`it-brand-${idx}`}
                      value={String(it.brand ?? "")}
                      onChange={(e) => setItem(idx, { brand: e.target.value })}
                      className="min-h-[44px] text-fs-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`it-loc-${idx}`} className="text-fs-xs">
                      Teslim Yeri
                    </Label>
                    <Input
                      id={`it-loc-${idx}`}
                      value={String(it.deliveryLocation ?? "")}
                      onChange={(e) => setItem(idx, { deliveryLocation: e.target.value })}
                      className="min-h-[44px] text-fs-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Label htmlFor={`it-spec-${idx}`} className="text-fs-xs">
                      Teknik Açıklama
                    </Label>
                    <Textarea
                      id={`it-spec-${idx}`}
                      rows={2}
                      value={String(it.spec ?? "")}
                      onChange={(e) => setItem(idx, { spec: e.target.value })}
                      className="text-fs-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 min-h-[44px] text-fs-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={it.altAllowed ?? true}
                      onChange={(e) => setItem(idx, { altAllowed: e.target.checked })}
                      className="w-4 h-4 accent-[#FF6B2B]"
                    />
                    Alternatif ürün kabul edilir
                  </label>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addItem} className="mt-3 min-h-[44px]">
            <Plus className="w-4 h-4 mr-1.5" /> Kalem Ekle
          </Button>
        </Section>

        <Section title="Finansal Bilgiler" hint={`Kalem toplamı: ${fmtTRY(total)}`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="pr-budget" className="text-fs-xs">
                Tahmini Bütçe *
              </Label>
              <Input
                id="pr-budget"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={String(values.budget ?? 0)}
                onChange={(e) => set("budget", e.target.value)}
                aria-invalid={!!errors.budget}
                className="min-h-[44px] text-fs-sm"
              />
              <FieldError id="err-budget" msg={errors.budget} />
              {total > 0 && Number(values.budget) !== total && (
                <button
                  type="button"
                  onClick={() => set("budget", total)}
                  className="mt-1 text-fs-xs text-[#FF6B2B] hover:underline min-h-[32px]"
                >
                  Kalem toplamını uygula ({fmtTRY(total)})
                </button>
              )}
            </div>
            <div>
              <Label htmlFor="pr-currency" className="text-fs-xs">
                Para Birimi
              </Label>
              <select
                id="pr-currency"
                value={values.currency}
                onChange={(e) => set("currency", e.target.value as RequestFormValues["currency"])}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-budgetcode" className="text-fs-xs">
                Bütçe Kodu
              </Label>
              <Input
                id="pr-budgetcode"
                value={String(values.budgetCode ?? "")}
                onChange={(e) => set("budgetCode", e.target.value)}
                className="min-h-[44px] text-fs-sm"
              />
            </div>
            <div>
              <Label htmlFor="pr-costcenter" className="text-fs-xs">
                Masraf Merkezi
              </Label>
              <Input
                id="pr-costcenter"
                value={String(values.costCenter ?? "")}
                onChange={(e) => set("costCenter", e.target.value)}
                className="min-h-[44px] text-fs-sm"
              />
            </div>
          </div>
        </Section>

        <Section
          title="Ekler"
          hint={`PDF, JPG veya PNG · en fazla ${MAX_FILE_MB} MB`}
        >
          <div className="space-y-2">
            {values.attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-fs-sm text-foreground hover:text-[#FF6B2B] truncate"
                    >
                      {a.name}
                    </a>
                  ) : (
                    <span className="text-fs-sm text-foreground truncate">{a.name}</span>
                  )}
                  <span className="text-fs-xs text-muted-foreground shrink-0">
                    {Math.max(1, Math.round(Number(a.size) / 1024))} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "attachments",
                      values.attachments.filter((x) => x.id !== a.id)
                    )
                  }
                  aria-label={`${a.name} ekini kaldır`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {!values.attachments.length && (
              <p className="text-fs-xs text-muted-foreground">Henüz ek yok.</p>
            )}
            <label className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg border border-border bg-muted/30 text-fs-sm text-foreground cursor-pointer hover:border-[#FF6B2B]/50">
              <Plus className="w-4 h-4" /> Ek Yükle
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => {
                  onPickFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </Section>
      </div>

      {/* sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 safe-area-bottom sm:px-6">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3">
          <span className="text-fs-xs text-muted-foreground truncate">
            {dirty ? "Kaydedilmemiş değişiklikler var" : "Tüm değişiklikler kayıtlı"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={requestLeave} disabled={saving} className="min-h-[44px]">
              Vazgeç
            </Button>
            <Button onClick={doSave} disabled={saving} aria-busy={saving} className="min-h-[44px]">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Değişiklikleri Kaydet
            </Button>
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={confirmLeave}
        onKeepEditing={() => setConfirmLeave(false)}
        onDiscard={() => {
          setConfirmLeave(false);
          onClose();
        }}
      />
      <DeleteDraftDialog
        open={confirmDelete}
        loading={!!request && workflow.isPending(request.id, "delete")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!request) return;
          const ok = await workflow.remove(request.id);
          setConfirmDelete(false);
          if (ok) onDeleted();
        }}
      />
      <StaleRequestDialog
        open={stale}
        onReview={() => setStale(false)}
        onReload={() => {
          setStale(false);
          if (request) {
            const fresh = workflow.find(request.id);
            if (fresh) {
              const next = requestToForm(fresh);
              setValues(next);
              baselineRef.current = JSON.stringify(next);
              openedVersion.current = fresh.version ?? 0;
              openedUpdatedAt.current = fresh.updatedAt;
              toast.success("Güncel talep verisi yüklendi.");
            }
          }
        }}
      />
    </div>
  );
};

export default PurchaseRequestForm;
