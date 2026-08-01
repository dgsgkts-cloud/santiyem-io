// RFQ mutation layer.
// Backend limitation: no rfq / rfq_suppliers / quotations tables exist yet, so
// records live in a locally persisted store (survives refresh). Every mutation
// runs the same guards a server mutation would: record existence, role
// permission, valid status transition, duplicate protection and quotation
// validity — so swapping in a table later only changes the persistence calls.
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLicense } from "@/lib/licenseStore";
import type { Order, Request, Supplier } from "../procurementConstants";
import {
  RFQ_GENERIC_ERROR,
  RFQ_PERMISSION_MESSAGE,
  canRfqTransition,
  canRunRfqAction,
  orderFromSelection,
  seedRfqFromRequest,
  type Quotation,
  type RfqAction,
  type RfqAuditEntry,
  type RfqRecord,
  type RfqSelection,
  type RfqStatus,
  type RfqSupplierEntry,
} from "./rfqModel";

const STORE_KEY = "santiyem_rfq_store";
const wait = (ms = 380) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString();

type StoreMap = Record<string, RfqRecord>;

const readStore = (): StoreMap => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as StoreMap) : {};
  } catch {
    return {};
  }
};
const writeStore = (map: StoreMap) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — in-memory state still applies */
  }
};

/** Read-only snapshot of the persisted RFQ store (used by analytics/CEO mode). */
export const loadRfqRecords = (): RfqRecord[] => Object.values(readStore());

export type RfqMutationKey = `${string}:${RfqAction}`;

export interface AddSuppliersInput {
  requestId: string;
  suppliers: { supplier: Supplier; allowInactive?: boolean }[];
  actor: string;
}

export interface RecordQuotationInput {
  requestId: string;
  supplierId: string;
  quotation: Omit<Quotation, "version" | "submittedAt" | "recordedBy">;
  actor: string;
  isRevision?: boolean;
}

export interface ConfirmSelectionInput {
  requestId: string;
  supplierId: string;
  reason: string;
  note?: string;
  actor: string;
  acceptExpired?: boolean;
}

export interface CreateOrderInput {
  requestId: string;
  actor: string;
  etaDays: number;
  notes?: string;
}

export interface RfqWorkflow {
  records: RfqRecord[];
  pending: RfqMutationKey | null;
  isPending: (requestId: string, action: RfqAction) => boolean;
  can: (action: RfqAction) => boolean;
  get: (requestId: string) => RfqRecord | undefined;
  orders: Order[];
  addSuppliers: (input: AddSuppliersInput) => Promise<boolean>;
  removeSupplier: (requestId: string, supplierId: string, actor: string) => Promise<boolean>;
  send: (requestId: string, actor: string) => Promise<boolean>;
  remind: (requestId: string, actor: string) => Promise<boolean>;
  updateDeadline: (requestId: string, deadline: string, actor: string) => Promise<boolean>;
  recordQuotation: (input: RecordQuotationInput) => Promise<boolean>;
  requestRevision: (
    requestId: string,
    supplierId: string,
    note: string,
    actor: string
  ) => Promise<boolean>;
  setCandidate: (requestId: string, supplierId: string | null) => void;
  confirmSelection: (input: ConfirmSelectionInput) => Promise<boolean>;
  changeSelection: (requestId: string, actor: string) => Promise<boolean>;
  createOrder: (input: CreateOrderInput) => Promise<Order | null>;
  cancel: (requestId: string, actor: string) => Promise<boolean>;
}

/**
 * @param requests approved purchase requests that carry an `rfq` payload.
 */
export function useRfqWorkflow(requests: Request[], catalog: Supplier[]): RfqWorkflow {
  const license = useLicense();
  const [store, setStoreRaw] = useState<StoreMap>(() => readStore());
  const [pending, setPending] = useState<RfqMutationKey | null>(null);
  const inflight = useRef<Set<string>>(new Set());

  const owner =
    license.role === "procurement" ? "Satın Alma Sorumlusu" : "Satın Alma Yöneticisi";

  const setStore = useCallback(
    (updater: (prev: StoreMap) => StoreMap) =>
      setStoreRaw((prev) => {
        const next = updater(prev);
        writeStore(next);
        return next;
      }),
    []
  );

  /** Seeds are derived from the request; stored deltas always win. */
  const records = useMemo(() => {
    const withRfq = requests.filter((r) => !!r.rfq);
    return withRfq.map((r) => store[r.id] ?? seedRfqFromRequest(r, catalog, owner));
  }, [requests, catalog, store, owner]);

  const get = useCallback(
    (requestId: string) => records.find((r) => r.requestId === requestId),
    [records]
  );

  const can = useCallback(
    (action: RfqAction) => canRunRfqAction(license.role, action),
    [license.role]
  );

  const isPending = useCallback(
    (requestId: string, action: RfqAction) => pending === `${requestId}:${action}`,
    [pending]
  );

  /** Shared mutation runner: guards → optimistic patch → persist → toast. */
  const run = useCallback(
    async (
      action: RfqAction,
      requestId: string,
      opts: {
        expect?: RfqStatus[];
        to?: RfqStatus;
        patch: (current: RfqRecord) => Partial<RfqRecord> | null;
        audit: (current: RfqRecord) => RfqAuditEntry;
        success: string;
        /** invalid-state message shown when `expect` fails */
        invalidMessage?: string;
        delay?: number;
      }
    ): Promise<RfqRecord | null> => {
      const key: RfqMutationKey = `${requestId}:${action}`;
      if (!requestId) {
        toast.error(RFQ_GENERIC_ERROR);
        return null;
      }
      if (inflight.current.has(key)) return null; // duplicate submit guard
      if (!canRunRfqAction(license.role, action)) {
        toast.error(RFQ_PERMISSION_MESSAGE);
        return null;
      }
      const current = get(requestId);
      if (!current) {
        toast.error(RFQ_GENERIC_ERROR);
        return null;
      }
      if (opts.expect && !opts.expect.includes(current.status)) {
        toast.error(opts.invalidMessage ?? "Bu RFQ mevcut durumunda bu işlemi desteklemiyor.");
        return null;
      }
      if (opts.to && opts.to !== current.status && !canRfqTransition(current.status, opts.to)) {
        toast.error("Bu durum geçişi geçerli değil.");
        return null;
      }

      inflight.current.add(key);
      setPending(key);
      const snapshot = store[requestId];
      try {
        const patch = opts.patch(current);
        if (!patch) return null;
        await wait(opts.delay);
        const next: RfqRecord = {
          ...current,
          ...patch,
          audit: [...current.audit, opts.audit(current)],
          version: current.version + 1,
        };
        setStore((prev) => ({ ...prev, [requestId]: next }));
        toast.success(opts.success);
        return next;
      } catch (err) {
        if (import.meta.env.DEV) console.error(`[rfq] ${action} failed`, err);
        setStore((prev) =>
          snapshot ? { ...prev, [requestId]: snapshot } : prev
        );
        toast.error(RFQ_GENERIC_ERROR);
        return null;
      } finally {
        inflight.current.delete(key);
        setPending((p) => (p === key ? null : p));
      }
    },
    [get, license.role, setStore, store]
  );

  const addSuppliers = useCallback(
    async ({ requestId, suppliers, actor }: AddSuppliersInput) => {
      if (!suppliers.length) {
        toast.error("En az bir tedarikçi seçin.");
        return false;
      }
      const res = await run("add_supplier", requestId, {
        expect: [
          "Taslak",
          "Tedarikçilere Gönderildi",
          "Teklifler Bekleniyor",
          "Karşılaştırma Aşamasında",
        ],
        patch: (current) => {
          const fresh = suppliers.filter(
            ({ supplier }) => !current.suppliers.some((s) => s.supplierId === supplier.id)
          );
          if (!fresh.length) {
            toast.error("Seçilen tedarikçiler RFQ'ya zaten eklenmiş.");
            return null;
          }
          const at = stamp();
          const entries: RfqSupplierEntry[] = fresh.map(({ supplier }) => ({
            supplierId: supplier.id,
            supplierName: supplier.name,
            category: supplier.category,
            performance: supplier.score,
            active: true,
            status: current.sentAt ? "Teklif Bekleniyor" : "Davet Edildi",
            invitedAt: at,
            sentAt: current.sentAt,
            revisions: [],
            messages: [],
          }));
          return { suppliers: [...current.suppliers, ...entries] };
        },
        audit: () => ({
          at: stamp(),
          actor,
          event: `Tedarikçi eklendi · ${suppliers.map((s) => s.supplier.name).join(", ")}`,
        }),
        success: "Tedarikçiler RFQ'ya eklendi.",
      });
      return !!res;
    },
    [run]
  );

  const removeSupplier = useCallback(
    async (requestId: string, supplierId: string, actor: string) => {
      const res = await run("remove_supplier", requestId, {
        expect: ["Taslak", "Tedarikçilere Gönderildi", "Teklifler Bekleniyor", "Karşılaştırma Aşamasında"],
        patch: (current) => {
          const target = current.suppliers.find((s) => s.supplierId === supplierId);
          if (!target) return null;
          if (current.selection?.supplierId === supplierId) {
            toast.error("Seçili tedarikçi RFQ'dan çıkarılamaz.");
            return null;
          }
          return {
            suppliers: current.suppliers.filter((s) => s.supplierId !== supplierId),
            candidateSupplierId:
              current.candidateSupplierId === supplierId ? null : current.candidateSupplierId,
          };
        },
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `Tedarikçi çıkarıldı · ${
            current.suppliers.find((s) => s.supplierId === supplierId)?.supplierName ?? supplierId
          }`,
        }),
        success: "Tedarikçi RFQ'dan çıkarıldı.",
      });
      return !!res;
    },
    [run]
  );

  const send = useCallback(
    async (requestId: string, actor: string) => {
      const res = await run("send", requestId, {
        expect: ["Taslak"],
        to: "Tedarikçilere Gönderildi",
        patch: (current) => {
          if (!current.suppliers.length) {
            toast.error("RFQ göndermek için en az bir tedarikçi ekleyin.");
            return null;
          }
          const at = stamp();
          return {
            status: "Teklifler Bekleniyor" as RfqStatus,
            sentAt: at,
            suppliers: current.suppliers.map((s) => ({
              ...s,
              sentAt: s.sentAt ?? at,
              status: s.status === "Davet Edildi" ? ("Teklif Bekleniyor" as const) : s.status,
            })),
          };
        },
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `RFQ ${current.suppliers.length} tedarikçiye hazırlandı`,
          from: current.status,
          to: "Teklifler Bekleniyor",
        }),
        // Honest copy: there is no confirmed e-mail/WhatsApp delivery receipt.
        success: "RFQ gönderim için hazırlandı.",
      });
      return !!res;
    },
    [run]
  );

  const remind = useCallback(
    async (requestId: string, actor: string) => {
      const res = await run("remind", requestId, {
        expect: ["Tedarikçilere Gönderildi", "Teklifler Bekleniyor", "Karşılaştırma Aşamasında"],
        patch: (current) => {
          const waiting = current.suppliers.filter(
            (s) => !s.quotation && s.status !== "Reddedildi"
          );
          if (!waiting.length) {
            toast.error("Hatırlatma gönderilecek bekleyen tedarikçi yok.");
            return null;
          }
          return {
            suppliers: current.suppliers.map((s) =>
              !s.quotation && s.status !== "Reddedildi"
                ? {
                    ...s,
                    messages: [
                      ...s.messages,
                      { at: stamp(), actor, text: "Teklif hatırlatması hazırlandı." },
                    ],
                  }
                : s
            ),
          };
        },
        audit: () => ({ at: stamp(), actor, event: "Teklif hatırlatması hazırlandı" }),
        success: "Hatırlatma hazırlandı.",
      });
      return !!res;
    },
    [run]
  );

  const updateDeadline = useCallback(
    async (requestId: string, deadline: string, actor: string) => {
      if (!deadline) {
        toast.error("Geçerli bir son tarih seçin.");
        return false;
      }
      const res = await run("update_deadline", requestId, {
        expect: [
          "Taslak",
          "Tedarikçilere Gönderildi",
          "Teklifler Bekleniyor",
          "Karşılaştırma Aşamasında",
          "Tedarikçi Seçildi",
        ],
        patch: () => ({ deadline }),
        audit: (current) => ({
          at: stamp(),
          actor,
          event: "Teklif son tarihi güncellendi",
          from: current.deadline,
          to: deadline,
        }),
        success: "Teklif son tarihi güncellendi.",
      });
      return !!res;
    },
    [run]
  );

  const recordQuotation = useCallback(
    async ({ requestId, supplierId, quotation, actor, isRevision }: RecordQuotationInput) => {
      if (!quotation.lines.length) {
        toast.error("Teklife en az bir kalem eklenmelidir.");
        return false;
      }
      if (quotation.lines.some((l) => l.qty <= 0 || l.unitPrice < 0)) {
        toast.error("Miktar sıfırdan büyük, birim fiyat negatif olmayan bir değer olmalıdır.");
        return false;
      }
      const res = await run("record_quotation", requestId, {
        expect: ["Tedarikçilere Gönderildi", "Teklifler Bekleniyor", "Karşılaştırma Aşamasında"],
        invalidMessage:
          "Teklif girmek için RFQ tedarikçilere gönderilmiş olmalıdır.",
        patch: (current) => {
          const entry = current.suppliers.find((s) => s.supplierId === supplierId);
          if (!entry) {
            toast.error("Tedarikçi bu RFQ'da bulunamadı.");
            return null;
          }
          const version = (entry.quotation?.version ?? 0) + 1;
          const q: Quotation = {
            ...quotation,
            version,
            submittedAt: stamp(),
            recordedBy: actor,
          };
          return {
            status: "Karşılaştırma Aşamasında" as RfqStatus,
            suppliers: current.suppliers.map((s) =>
              s.supplierId === supplierId
                ? {
                    ...s,
                    quotation: q,
                    revisions: s.quotation ? [...s.revisions, s.quotation] : s.revisions,
                    status:
                      isRevision || s.quotation
                        ? ("Revize Teklif Geldi" as const)
                        : ("Teklif Geldi" as const),
                  }
                : s
            ),
          };
        },
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `${
            current.suppliers.find((s) => s.supplierId === supplierId)?.supplierName
          } teklifi kaydedildi`,
          detail: `Toplam ${quotation.total.toLocaleString("tr-TR")} ${quotation.currency}`,
        }),
        success: "Teklif kaydedildi.",
      });
      return !!res;
    },
    [run]
  );

  const requestRevision = useCallback(
    async (requestId: string, supplierId: string, note: string, actor: string) => {
      if (!note.trim()) {
        toast.error("Revizyon gerekçesi zorunludur.");
        return false;
      }
      const res = await run("request_revision", requestId, {
        expect: ["Teklifler Bekleniyor", "Karşılaştırma Aşamasında"],
        patch: (current) => {
          const entry = current.suppliers.find((s) => s.supplierId === supplierId);
          if (!entry?.quotation) {
            toast.error("Revizyon istemek için kayıtlı bir teklif gerekir.");
            return null;
          }
          return {
            suppliers: current.suppliers.map((s) =>
              s.supplierId === supplierId
                ? {
                    ...s,
                    status: "Revizyon İstendi" as const,
                    revisionRequestedAt: stamp(),
                    revisionNote: note.trim(),
                    messages: [...s.messages, { at: stamp(), actor, text: note.trim() }],
                  }
                : s
            ),
          };
        },
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `Revizyon istendi · ${
            current.suppliers.find((s) => s.supplierId === supplierId)?.supplierName
          }`,
          detail: note.trim(),
        }),
        success: "Revizyon talebi kaydedildi.",
      });
      return !!res;
    },
    [run]
  );

  /** Temporary candidate only — never persisted as a final selection. */
  const setCandidate = useCallback(
    (requestId: string, supplierId: string | null) => {
      const current = get(requestId);
      if (!current) return;
      if (!canRunRfqAction(license.role, "select_candidate")) {
        toast.error(RFQ_PERMISSION_MESSAGE);
        return;
      }
      if (supplierId) {
        const entry = current.suppliers.find((s) => s.supplierId === supplierId);
        if (!entry?.quotation) {
          toast.error("Teklifi olmayan bir tedarikçi seçilemez.");
          return;
        }
      }
      setStore((prev) => ({
        ...prev,
        [requestId]: { ...current, candidateSupplierId: supplierId },
      }));
    },
    [get, license.role, setStore]
  );

  const confirmSelection = useCallback(
    async ({ requestId, supplierId, reason, note, actor, acceptExpired }: ConfirmSelectionInput) => {
      if (!reason.trim()) {
        toast.error("Seçim gerekçesi zorunludur.");
        return false;
      }
      const res = await run("confirm_selection", requestId, {
        expect: ["Karşılaştırma Aşamasında", "Teklifler Bekleniyor"],
        to: "Tedarikçi Seçildi",
        patch: (current) => {
          const entry = current.suppliers.find((s) => s.supplierId === supplierId);
          if (!entry?.quotation) {
            toast.error("Teklifi olmayan bir tedarikçi seçilemez.");
            return null;
          }
          if (!entry.active) {
            toast.error("Pasif tedarikçi seçilemez.");
            return null;
          }
          const expired =
            !!entry.quotation.validUntil &&
            new Date(entry.quotation.validUntil).getTime() < Date.now();
          if (expired && !acceptExpired) {
            toast.error("Geçerlilik süresi geçmiş teklif için açık onay gerekir.");
            return null;
          }
          const selection: RfqSelection = {
            supplierId,
            supplierName: entry.supplierName,
            quotationVersion: entry.quotation.version,
            reason: reason.trim(),
            note: note?.trim() || undefined,
            by: actor,
            at: stamp(),
            total: entry.quotation.total,
            currency: entry.quotation.currency,
          };
          return {
            status: "Tedarikçi Seçildi" as RfqStatus,
            selection,
            candidateSupplierId: null,
            suppliers: current.suppliers.map((s) =>
              s.supplierId === supplierId
                ? { ...s, status: "Seçildi" as const }
                : s.status === "Seçildi"
                  ? { ...s, status: s.quotation ? ("Teklif Geldi" as const) : ("Teklif Bekleniyor" as const) }
                  : s
            ),
          };
        },
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `Tedarikçi seçildi · ${
            current.suppliers.find((s) => s.supplierId === supplierId)?.supplierName
          }`,
          from: current.status,
          to: "Tedarikçi Seçildi",
          detail: reason.trim(),
        }),
        success: "Tedarikçi seçimi kaydedildi.",
      });
      return !!res;
    },
    [run]
  );

  const changeSelection = useCallback(
    async (requestId: string, actor: string) => {
      const res = await run("change_selection", requestId, {
        expect: ["Tedarikçi Seçildi"],
        to: "Karşılaştırma Aşamasında",
        patch: (current) => ({
          status: "Karşılaştırma Aşamasında" as RfqStatus,
          selection: undefined,
          candidateSupplierId: current.selection?.supplierId ?? null,
          suppliers: current.suppliers.map((s) =>
            s.status === "Seçildi"
              ? { ...s, status: s.quotation ? ("Teklif Geldi" as const) : ("Teklif Bekleniyor" as const) }
              : s
          ),
        }),
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `Tedarikçi seçimi geri alındı · ${current.selection?.supplierName ?? "—"}`,
          from: current.status,
          to: "Karşılaştırma Aşamasında",
        }),
        success: "Seçim karşılaştırma aşamasına döndürüldü.",
      });
      return !!res;
    },
    [run]
  );

  const createOrder = useCallback(
    async ({ requestId, actor, etaDays, notes }: CreateOrderInput) => {
      const before = get(requestId);
      if (before?.orderNo) {
        toast.error("Bu RFQ için sipariş zaten oluşturulmuş.");
        return null;
      }
      const res = await run("create_order", requestId, {
        expect: ["Tedarikçi Seçildi"],
        to: "Siparişe Dönüştürüldü",
        patch: (current) => {
          const selection = current.selection;
          if (!selection) {
            toast.error("Sipariş için önce tedarikçi seçimi onaylanmalıdır.");
            return null;
          }
          const entry = current.suppliers.find((s) => s.supplierId === selection.supplierId);
          if (!entry?.quotation) {
            toast.error("Seçili teklif bulunamadı.");
            return null;
          }
          if (entry.quotation.version !== selection.quotationVersion) {
            toast.error("Seçili teklif güncel değil. Seçimi yenileyin.");
            return null;
          }
          if (!entry.active) {
            toast.error("Pasif tedarikçi için sipariş oluşturulamaz.");
            return null;
          }
          return {
            status: "Siparişe Dönüştürüldü" as RfqStatus,
            orderNo: `PO-${current.requestNo.replace("PR-", "")}`,
            notes: notes?.trim() || current.notes,
          };
        },
        audit: (current) => ({
          at: stamp(),
          actor,
          event: `Sipariş oluşturuldu · ${current.selection?.supplierName ?? "—"}`,
          from: current.status,
          to: "Siparişe Dönüştürüldü",
          ref: `PO-${current.requestNo.replace("PR-", "")}`,
        }),
        success: "Sipariş oluşturuldu.",
      });
      if (!res?.selection) return null;
      return orderFromSelection(res, res.selection, etaDays);
    },
    [get, run]
  );

  const cancel = useCallback(
    async (requestId: string, actor: string) => {
      const res = await run("cancel", requestId, {
        expect: [
          "Taslak",
          "Tedarikçilere Gönderildi",
          "Teklifler Bekleniyor",
          "Karşılaştırma Aşamasında",
          "Tedarikçi Seçildi",
        ],
        to: "İptal",
        patch: () => ({
          status: "İptal" as RfqStatus,
          cancelledAt: stamp(),
          candidateSupplierId: null,
        }),
        audit: (current) => ({
          at: stamp(),
          actor,
          event: "RFQ kapatıldı",
          from: current.status,
          to: "İptal",
        }),
        success: "RFQ kapatıldı.",
      });
      return !!res;
    },
    [run]
  );

  /** Orders created from finalized selections, exposed to the orders list. */
  const orders = useMemo(
    () =>
      records
        .filter((r) => r.status === "Siparişe Dönüştürüldü" && r.selection)
        .map((r) => orderFromSelection(r, r.selection!, 7)),
    [records]
  );

  return {
    records,
    pending,
    isPending,
    can,
    get,
    orders,
    addSuppliers,
    removeSupplier,
    send,
    remind,
    updateDeadline,
    recordQuotation,
    requestRevision,
    setCandidate,
    confirmSelection,
    changeSelection,
    createOrder,
    cancel,
  };
}
