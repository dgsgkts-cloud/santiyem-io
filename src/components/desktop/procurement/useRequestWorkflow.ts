// Purchase-request mutation layer.
// NOTE: there is no purchase_requests table in the backend yet, so mutations run
// against an in-memory store seeded from the demo data hook. Every mutation
// validates: request id, current status transition and role permission — the
// same guards a server mutation would run, so wiring a table later is a swap of
// the `mutate` body only.
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLicense } from "@/lib/licenseStore";
import type { Request, RequestAuditEntry, RequestRFQ } from "./procurementConstants";
import {
  ACTION_LABELS,
  canRunAction,
  canTransition,
  GENERIC_ERROR,
  PERMISSION_MESSAGE,
  type WorkflowAction,
} from "./procurementWorkflow";

export type MutationKey = `${string}:${WorkflowAction}`;

interface ApproveInput { id: string }
interface RejectInput { id: string; reason: string; note?: string }
interface RfqInput { id: string; suppliers: string[]; deadline: string; notes?: string }
export interface SubmitInput {
  id: string;
  approverUserId: string | null;
  approverName: string | null;
  approverRole: string | null;
  approvalDueAt?: string;
  approvalNote?: string;
  submittedBy: string;
}

export interface RequestWorkflow {
  requests: Request[];
  pending: MutationKey | null;
  isPending: (id: string, action: WorkflowAction) => boolean;
  can: (action: WorkflowAction) => boolean;
  submit: (input: SubmitInput) => Promise<boolean>;
  approve: (input: ApproveInput) => Promise<boolean>;
  reject: (input: RejectInput) => Promise<boolean>;
  createRfq: (input: RfqInput) => Promise<RequestRFQ | null>;
  sendRfq: (id: string) => Promise<boolean>;
  toOrder: (id: string) => Promise<boolean>;
  reopen: (id: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

const wait = (ms = 420) => new Promise((r) => setTimeout(r, ms));

/** Overrides are persisted locally so an assigned approver survives refresh
 *  until a real purchase_requests table exists. */
const STORE_KEY = "santiyem_pr_workflow_overrides";
type OverrideMap = Record<string, Partial<Request> | "deleted">;

const readStore = (): OverrideMap => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
};
const writeStore = (map: OverrideMap) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — in-memory state still applies */
  }
};

export function useRequestWorkflow(seedRequests: Request[]): RequestWorkflow {
  const license = useLicense();
  const [overrides, setOverridesRaw] = useState<OverrideMap>(() => readStore());
  const [pending, setPending] = useState<MutationKey | null>(null);
  const inflight = useRef<Set<string>>(new Set());

  const setOverrides = useCallback(
    (updater: (prev: OverrideMap) => OverrideMap) =>
      setOverridesRaw((prev) => {
        const next = updater(prev);
        writeStore(next);
        return next;
      }),
    []
  );


  const requests = useMemo(
    () =>
      seedRequests
        .filter((r) => overrides[r.id] !== "deleted")
        .map((r) => {
          const o = overrides[r.id];
          return o && o !== "deleted" ? { ...r, ...o } : r;
        }),
    [seedRequests, overrides]
  );

  const actorName = license.role === "super_admin" ? "Platform Yöneticisi" : "Yetkili Kullanıcı";

  const can = useCallback(
    (action: WorkflowAction) => canRunAction(license.role, action),
    [license.role]
  );

  const run = useCallback(
    async (
      action: WorkflowAction,
      id: string,
      opts: {
        expect?: Request["status"][];
        to?: Request["status"];
        patch: (current: Request) => Partial<Request>;
        audit: (current: Request) => RequestAuditEntry;
        success: string;
      }
    ): Promise<Request | null> => {
      const key: MutationKey = `${id}:${action}`;
      if (!id) {
        toast.error(GENERIC_ERROR);
        return null;
      }
      if (inflight.current.has(key)) return null; // double-click guard
      if (!canRunAction(license.role, action)) {
        toast.error(PERMISSION_MESSAGE);
        return null;
      }
      const current = requests.find((r) => r.id === id);
      if (!current) {
        toast.error(GENERIC_ERROR);
        return null;
      }
      if (opts.expect && !opts.expect.includes(current.status)) {
        toast.error("Bu talep zaten işlendi.");
        return null;
      }
      if (opts.to && !canTransition(current.status, opts.to)) {
        toast.error("Bu durum geçişi geçerli değil.");
        return null;
      }

      inflight.current.add(key);
      setPending(key);
      const previous = overrides[id];
      try {
        const patch = opts.patch(current);
        await wait();
        setOverrides((prev) => {
          const base = prev[id] && prev[id] !== "deleted" ? (prev[id] as Partial<Request>) : {};
          return {
            ...prev,
            [id]: {
              ...base,
              ...patch,
              audit: [...(current.audit ?? []), opts.audit(current)],
            },
          };
        });
        toast.success(opts.success);
        return { ...current, ...patch };
      } catch (err) {
        if (import.meta.env.DEV) console.error(`[procurement] ${action} failed`, err);
        setOverrides((prev) => ({ ...prev, [id]: previous ?? {} }));
        toast.error(GENERIC_ERROR);
        return null;
      } finally {
        inflight.current.delete(key);
        setPending((p) => (p === key ? null : p));
      }
    },
    [license.role, overrides, requests]
  );

  const stamp = () => new Date().toISOString();

  const submit = useCallback(
    async (input: SubmitInput) => {
      // A request may never enter the approval state without a resolved
      // approver (a named person or an explicit approving role).
      if (!input.approverUserId && !input.approverRole) {
        toast.error("Bu talep için uygun bir onaylayıcı bulunamadı.");
        return false;
      }
      return !!(await run("submit", input.id, {
        expect: ["Taslak"],
        to: "Onay Bekliyor",
        patch: () => ({
          status: "Onay Bekliyor" as const,
          approvalStage: 1,
          approverUserId: input.approverUserId,
          approverName: input.approverName,
          approverRole: input.approverRole,
          submittedForApprovalAt: stamp(),
          submittedForApprovalBy: input.submittedBy,
          approvalDueAt: input.approvalDueAt,
          approvalNote: input.approvalNote,
        }),
        audit: (c) => ({
          at: stamp(),
          actor: input.submittedBy,
          event: input.approverName
            ? `Onaya gönderildi · ${input.approverName}`
            : `Onaya gönderildi · ${input.approverRole ?? "Yönetici"}`,
          from: c.status,
          to: "Onay Bekliyor",
          reason: input.approvalNote || undefined,
        }),
        success: submitSuccessCopy(input.approverName, input.approverRole),
      }));
    },
    [run]
  );


  const approve = useCallback(
    async ({ id }: ApproveInput) =>
      !!(await run("approve", id, {
        expect: ["Onay Bekliyor"],
        to: "Onaylandı",
        patch: () => ({
          status: "Onaylandı",
          approvalStage: 4,
          approvedBy: actorName,
          approvedAt: stamp(),
        }),
        audit: (c) => ({ at: stamp(), actor: actorName, event: "Onaylandı", from: c.status, to: "Onaylandı" }),
        success: "Talep onaylandı.",
      })),
    [run, actorName]
  );

  const reject = useCallback(
    async ({ id, reason, note }: RejectInput) => {
      if (!reason || !reason.trim()) {
        toast.error("Red nedeni zorunludur.");
        return false;
      }
      return !!(await run("reject", id, {
        expect: ["Onay Bekliyor"],
        to: "İptal",
        patch: () => ({
          status: "İptal",
          approvalStage: 0,
          rejectedBy: actorName,
          rejectedAt: stamp(),
          rejectionReason: reason.trim(),
          rejectionNote: note?.trim() || undefined,
        }),
        audit: (c) => ({
          at: stamp(),
          actor: actorName,
          event: "Reddedildi",
          from: c.status,
          to: "İptal",
          reason: reason.trim(),
        }),
        success: "Talep reddedildi.",
      }));
    },
    [run, actorName]
  );

  const createRfq = useCallback(
    async ({ id, suppliers, deadline, notes }: RfqInput) => {
      const current = requests.find((r) => r.id === id);
      if (!current?.items?.length) {
        toast.error("RFQ için en az bir geçerli kalem gerekir.");
        return null;
      }
      if (!suppliers.length) {
        toast.error("En az bir tedarikçi seçmelisiniz.");
        return null;
      }
      if (!deadline) {
        toast.error("Teklif son tarihi zorunludur.");
        return null;
      }
      const rfq: RequestRFQ = {
        no: `RFQ-${current.no.replace("PR-", "")}`,
        suppliers,
        deadline,
        notes: notes?.trim() || undefined,
        createdAt: stamp(),
      };
      const res = await run("rfq", id, {
        expect: ["Onaylandı"],
        patch: () => ({ rfq }),
        audit: () => ({ at: stamp(), actor: actorName, event: `Teklif talebi hazırlandı (${rfq.no})` }),
        success: "RFQ hazırlandı.",
      });
      return res ? rfq : null;
    },
    [run, actorName, requests]
  );

  const sendRfq = useCallback(
    async (id: string) => {
      const current = requests.find((r) => r.id === id);
      if (!current?.rfq) {
        toast.error(GENERIC_ERROR);
        return false;
      }
      return !!(await run("send_rfq", id, {
        expect: ["Onaylandı"],
        patch: (c) => ({ rfq: { ...c.rfq!, sentAt: stamp() } }),
        audit: () => ({ at: stamp(), actor: actorName, event: "RFQ tedarikçilere iletildi" }),
        success: "Teklif talebi oluşturuldu.",
      }));
    },
    [run, actorName, requests]
  );

  const toOrder = useCallback(
    async (id: string) =>
      !!(await run("to_order", id, {
        expect: ["Onaylandı"],
        to: "Sipariş Verildi",
        patch: (c) => ({
          status: "Sipariş Verildi",
          approvalStage: 4,
          orderNo: `PO-${c.no.replace("PR-", "")}`,
        }),
        audit: (c) => ({ at: stamp(), actor: actorName, event: "Siparişe dönüştürüldü", from: c.status, to: "Sipariş Verildi" }),
        success: "Talep siparişe dönüştürüldü.",
      })),
    [run, actorName]
  );

  const reopen = useCallback(
    async (id: string) =>
      !!(await run("reopen", id, {
        expect: ["İptal"],
        to: "Taslak",
        patch: () => ({
          status: "Taslak",
          approvalStage: 0,
          rejectionReason: undefined,
          rejectionNote: undefined,
          rejectedBy: undefined,
          rejectedAt: undefined,
        }),
        audit: (c) => ({ at: stamp(), actor: actorName, event: "Yeniden açıldı", from: c.status, to: "Taslak" }),
        success: "Talep yeniden açıldı.",
      })),
    [run, actorName]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!canRunAction(license.role, "delete")) {
        toast.error(PERMISSION_MESSAGE);
        return false;
      }
      const key: MutationKey = `${id}:delete`;
      if (inflight.current.has(key)) return false;
      const current = requests.find((r) => r.id === id);
      if (!current || current.status !== "Taslak") {
        toast.error(GENERIC_ERROR);
        return false;
      }
      inflight.current.add(key);
      setPending(key);
      await wait(2000); // project rule: deletions use a 2s confirmation animation
      setOverrides((prev) => ({ ...prev, [id]: "deleted" }));
      inflight.current.delete(key);
      setPending((p) => (p === key ? null : p));
      toast.success("Talep silindi.");
      return true;
    },
    [license.role, requests]
  );

  const isPending = useCallback(
    (id: string, action: WorkflowAction) => pending === `${id}:${action}`,
    [pending]
  );

  return {
    requests,
    pending,
    isPending,
    can,
    submit,
    approve,
    reject,
    createRfq,
    sendRfq,
    toOrder,
    reopen,
    remove,
  };
}

export { ACTION_LABELS };
