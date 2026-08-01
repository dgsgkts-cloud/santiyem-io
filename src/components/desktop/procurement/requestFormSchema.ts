// Shared validation + mapping layer for the purchase-request form.
// The SAME schema is used by create and edit modes (PurchaseRequestForm) so the
// two flows can never drift apart. Fields map 1:1 onto the `Request` type — no
// field is exposed that the store cannot persist.
import { z } from "zod";
import { CATS, PRIORITIES, type Request, type RequestItem } from "./procurementConstants";

export const UNITS = ["adet", "m", "m²", "m³", "kg", "ton", "paket", "sefer"] as const;
export const CURRENCIES = ["TRY", "USD", "EUR"] as const;

export const MAX_FILE_MB = 10;
export const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const itemSchema = z.object({
  key: z.string(),
  name: z.preprocess(trimmed, z.string().min(2, "Malzeme / hizmet adı en az 2 karakter olmalı").max(160)),
  category: z.preprocess(trimmed, z.string().min(1, "Kategori seçin")),
  qty: z.coerce.number({ invalid_type_error: "Miktar sayı olmalı" }).positive("Miktar sıfırdan büyük olmalı"),
  unit: z.preprocess(trimmed, z.string().min(1, "Birim seçin")),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Birim fiyat sayı olmalı" })
    .min(0, "Birim fiyat negatif olamaz")
    .optional()
    .default(0),
  spec: z.preprocess(trimmed, z.string().max(400).optional().or(z.literal(""))),
  brand: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(""))),
  altAllowed: z.boolean().optional().default(true),
  deliveryLocation: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(""))),
});

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  url: z.string().optional(),
});

export const requestFormSchema = z.object({
  no: z.string(),
  project: z.preprocess(trimmed, z.string().min(1, "Proje seçimi zorunludur")),
  requester: z.preprocess(trimmed, z.string().min(2, "Talep eden kişi zorunludur").max(120)),
  department: z.preprocess(trimmed, z.string().max(120).optional().or(z.literal(""))),
  needByDate: z
    .string()
    .min(1, "İhtiyaç tarihi zorunludur")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Geçerli bir tarih girin"),
  priority: z.enum(PRIORITIES),
  category: z.preprocess(trimmed, z.string().min(1, "Kategori seçin")),
  description: z.preprocess(trimmed, z.string().max(2000).optional().or(z.literal(""))),
  notes: z.preprocess(trimmed, z.string().max(2000).optional().or(z.literal(""))),
  deliveryLocation: z.preprocess(trimmed, z.string().max(160).optional().or(z.literal(""))),
  items: z.array(itemSchema).min(1, "En az bir geçerli kalem gerekir"),
  budget: z.coerce.number({ invalid_type_error: "Bütçe sayı olmalı" }).min(0, "Bütçe negatif olamaz"),
  currency: z.enum(CURRENCIES),
  budgetCode: z.preprocess(trimmed, z.string().max(60).optional().or(z.literal(""))),
  costCenter: z.preprocess(trimmed, z.string().max(60).optional().or(z.literal(""))),
  attachments: z.array(attachmentSchema),
});

export type RequestFormValues = z.input<typeof requestFormSchema>;
export type RequestFormErrors = Partial<Record<string, string>>;

export const emptyItem = (): RequestFormValues["items"][number] => ({
  key: `it-${Math.random().toString(36).slice(2, 9)}`,
  name: "",
  category: CATS[0],
  qty: 1,
  unit: UNITS[0],
  unitPrice: 0,
  spec: "",
  brand: "",
  altAllowed: true,
  deliveryLocation: "",
});

/** needBy is stored as "days from today"; the form edits a real date. */
export const needByToDate = (needBy: number): string => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + needBy);
  return d.toISOString().slice(0, 10);
};

export const dateToNeedBy = (iso: string): number => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(`${iso}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export const itemTotal = (it: { qty?: unknown; unitPrice?: unknown }) =>
  (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);

export const itemsTotal = (items: RequestFormValues["items"]) =>
  items.reduce((sum, it) => sum + itemTotal(it), 0);

/** Request record -> form values (edit mode). */
export const requestToForm = (r: Request): RequestFormValues => ({
  no: r.no,
  project: r.project,
  requester: r.requester,
  department: r.department ?? "",
  needByDate: needByToDate(r.needBy),
  priority: r.priority,
  category: r.category,
  description: r.description ?? "",
  notes: r.notes ?? "",
  deliveryLocation: r.deliveryLocation ?? "",
  items: (r.items ?? []).map((it, i) => ({
    key: `it-${i}-${it.name}`,
    name: it.name,
    category: it.category ?? r.category,
    qty: it.qty,
    unit: it.unit,
    unitPrice: it.unitPrice ?? 0,
    spec: it.spec ?? "",
    brand: it.brand ?? "",
    altAllowed: it.altAllowed ?? true,
    deliveryLocation: it.deliveryLocation ?? "",
  })),
  budget: r.budget,
  currency: r.currency ?? "TRY",
  budgetCode: r.budgetCode ?? "",
  costCenter: r.costCenter ?? "",
  attachments: (r.attachments ?? []).map((a) => ({ ...a })),
});

/** Blank form values (create mode). */
export const blankForm = (opts: {
  no: string;
  project: string;
  requester: string;
}): RequestFormValues => ({
  no: opts.no,
  project: opts.project,
  requester: opts.requester,
  department: "",
  needByDate: needByToDate(14),
  priority: "Orta",
  category: CATS[0],
  description: "",
  notes: "",
  deliveryLocation: "",
  items: [emptyItem()],
  budget: 0,
  currency: "TRY",
  budgetCode: "",
  costCenter: "",
  attachments: [],
});

/** Form values -> persistable Request patch. Never touches request number,
 *  creation metadata, approval history, rfq or order links. */
export const formToRequestPatch = (
  v: RequestFormValues
): Partial<Request> => {
  const items: RequestItem[] = v.items.map((it) => ({
    name: String(it.name).trim(),
    category: String(it.category).trim(),
    qty: Number(it.qty),
    unit: String(it.unit),
    unitPrice: Number(it.unitPrice) || 0,
    spec: it.spec ? String(it.spec).trim() : undefined,
    brand: it.brand ? String(it.brand).trim() : undefined,
    altAllowed: it.altAllowed ?? true,
    deliveryLocation: it.deliveryLocation ? String(it.deliveryLocation).trim() : undefined,
  }));
  return {
    project: String(v.project).trim(),
    requester: String(v.requester).trim(),
    department: v.department ? String(v.department).trim() : undefined,
    needBy: dateToNeedBy(v.needByDate),
    priority: v.priority,
    category: String(v.category).trim(),
    description: v.description ? String(v.description).trim() : undefined,
    notes: v.notes ? String(v.notes).trim() : undefined,
    deliveryLocation: v.deliveryLocation ? String(v.deliveryLocation).trim() : undefined,
    items,
    budget: Number(v.budget) || 0,
    currency: v.currency,
    budgetCode: v.budgetCode ? String(v.budgetCode).trim() : undefined,
    costCenter: v.costCenter ? String(v.costCenter).trim() : undefined,
    attachments: v.attachments.map((a) => ({ ...a })),
  };
};

/** Flat field-path -> message map so errors can render next to their input. */
export const validateRequestForm = (v: RequestFormValues) => {
  const parsed = requestFormSchema.safeParse(v);
  if (parsed.success) return { ok: true as const, errors: {} as RequestFormErrors };
  const errors: RequestFormErrors = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) errors[path] = issue.message;
  }
  return { ok: false as const, errors };
};

export const validateFile = (file: File): string | null => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return "Yalnızca PDF, JPG ve PNG dosyaları yüklenebilir.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `Dosya boyutu ${MAX_FILE_MB} MB'ı aşamaz.`;
  return null;
};

/** Human-readable diff for the audit trail. */
const LABELS: Record<string, string> = {
  project: "Proje",
  requester: "Talep eden",
  department: "Departman / masraf yeri",
  needBy: "İhtiyaç tarihi",
  priority: "Öncelik",
  category: "Kategori",
  description: "Açıklama",
  notes: "Notlar",
  deliveryLocation: "Teslim yeri",
  budget: "Tahmini bütçe",
  currency: "Para birimi",
  budgetCode: "Bütçe kodu",
  costCenter: "Masraf merkezi",
};

export interface FieldChange {
  field: string;
  label: string;
  from?: string;
  to?: string;
}

export const diffRequest = (before: Request, patch: Partial<Request>) => {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(LABELS)) {
    const a = (before as Record<string, unknown>)[key];
    const b = (patch as Record<string, unknown>)[key];
    const norm = (x: unknown) => (x === undefined || x === null || x === "" ? "" : String(x));
    if (norm(a) !== norm(b)) {
      changes.push({ field: key, label: LABELS[key], from: norm(a) || "—", to: norm(b) || "—" });
    }
  }
  const beforeItems = before.items ?? [];
  const afterItems = patch.items ?? [];
  const added = afterItems.filter((it) => !beforeItems.some((b) => b.name === it.name)).length;
  const removed = beforeItems.filter((it) => !afterItems.some((b) => b.name === it.name)).length;
  const changedItems =
    added === 0 &&
    removed === 0 &&
    JSON.stringify(beforeItems) !== JSON.stringify(afterItems);
  return { changes, itemsAdded: added, itemsRemoved: removed, itemsChanged: changedItems };
};

export const summarizeDiff = (d: ReturnType<typeof diffRequest>): string => {
  const parts: string[] = [];
  if (d.changes.length) parts.push(d.changes.map((c) => c.label).join(", "));
  if (d.itemsAdded) parts.push(`${d.itemsAdded} kalem eklendi`);
  if (d.itemsRemoved) parts.push(`${d.itemsRemoved} kalem çıkarıldı`);
  if (d.itemsChanged) parts.push("kalem bilgileri güncellendi");
  return parts.length ? parts.join(" · ") : "Değişiklik yok";
};
