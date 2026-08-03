// DEPO — CANONICAL CONSUMPTION CLASSIFICATION (single source of truth).
//
// The original bug: every negative stock movement (direction = -1) was treated
// as material consumption. Transfers between warehouses, count corrections,
// zimmet (assignment) issues, supplier returns and scrap all inflated the
// consumption rate, which in turn produced wrong stock-days / depletion
// forecasts.
//
// Consumption is now decided ONLY by the canonical movement_type, never by the
// sign of the quantity. The backend counterpart is the view
// public.inventory_consumption, which applies the exact same rule set; this
// module exists so the same classification can be unit-tested and applied to
// any already-loaded ledger rows without a second, divergent calculation.

/** Movement types that represent genuine operational material use. */
export const CONSUMPTION_MOVEMENT_TYPES = [
  "project_issue",
  "consumption",
] as const;

/** Analysed separately (loss/waste), never part of normal demand. */
export const SCRAP_MOVEMENT_TYPES = ["scrap"] as const;

/**
 * Known, canonical movement types that must NEVER count as consumption.
 * Kept explicit so a new movement type is flagged as `unknown` rather than
 * silently folded into demand.
 */
export const NON_CONSUMPTION_MOVEMENT_TYPES = [
  "goods_receipt",
  "manual_entry",
  "opening_balance",
  "transfer_out",
  "transfer_in",
  "return_in",
  "supplier_return",
  "customer_return",
  "count_increase",
  "count_decrease",
  "manual_adjustment",
  "assignment_out",
  "assignment_return",
  "reversal",
  "waste",
  "damaged",
] as const;

export type ConsumptionClass = "consumption" | "scrap" | "excluded" | "unknown";

const CONSUMPTION = new Set<string>(CONSUMPTION_MOVEMENT_TYPES);
const SCRAP = new Set<string>(SCRAP_MOVEMENT_TYPES);
const EXCLUDED = new Set<string>(NON_CONSUMPTION_MOVEMENT_TYPES);

/** Safe classification mapping for historical / legacy labels. */
const LEGACY_ALIASES: Record<string, string> = {
  project_consumption: "consumption",
  production_consumption: "consumption",
  site_consumption: "consumption",
  issue: "project_issue",
  out: "project_issue",
};

export const canonicalMovementType = (raw?: string | null): string => {
  const key = (raw ?? "").trim().toLowerCase();
  return LEGACY_ALIASES[key] ?? key;
};

/**
 * Classifies a movement for consumption purposes. Unknown labels are reported
 * as `unknown` and excluded from forecasting — never guessed.
 */
export const classifyConsumption = (movementType?: string | null): ConsumptionClass => {
  const t = canonicalMovementType(movementType);
  if (CONSUMPTION.has(t)) return "consumption";
  if (SCRAP.has(t)) return "scrap";
  if (EXCLUDED.has(t)) return "excluded";
  return "unknown";
};

export const isConsumptionMovement = (movementType?: string | null) =>
  classifyConsumption(movementType) === "consumption";

/** Shape of one canonical consumption record (mirrors the SQL view). */
export interface ConsumptionEvent {
  company_id?: string | null;
  warehouse_id?: string | null;
  material_id: string;
  project_id?: string | null;
  movement_date: string;
  consumption_quantity: number;
  base_unit: string | null;
  source_movement_id: string;
  consumption_type: string;
  unit_cost?: number | null;
}

interface LedgerLike {
  id: string;
  user_id?: string | null;
  material_id: string;
  warehouse_id?: string | null;
  project_id?: string | null;
  movement_type: string;
  direction?: number | null;
  quantity: number | string;
  unit?: string | null;
  unit_cost?: number | string | null;
  transaction_date: string;
  reversed_by?: string | null;
  reversal_of?: string | null;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Projects ledger rows onto the canonical consumption shape. Reversed and
 * reversal rows are dropped; only `consumption`-class types survive.
 */
export const toConsumptionEvents = (rows: LedgerLike[]): ConsumptionEvent[] =>
  rows
    .filter(
      (m) =>
        !m.reversed_by &&
        !m.reversal_of &&
        isConsumptionMovement(m.movement_type) &&
        num(m.quantity) > 0,
    )
    .map((m) => ({
      company_id: m.user_id ?? null,
      warehouse_id: m.warehouse_id ?? null,
      material_id: m.material_id,
      project_id: m.project_id ?? null,
      movement_date: m.transaction_date,
      consumption_quantity: num(m.quantity),
      base_unit: m.unit ?? null,
      source_movement_id: m.id,
      consumption_type: canonicalMovementType(m.movement_type),
      unit_cost: m.unit_cost === null || m.unit_cost === undefined ? null : num(m.unit_cost),
    }));

/** Ledger rows whose movement_type is not recognised at all. */
export const unknownMovementTypes = (rows: LedgerLike[]): string[] =>
  Array.from(
    new Set(
      rows
        .filter((m) => classifyConsumption(m.movement_type) === "unknown")
        .map((m) => canonicalMovementType(m.movement_type)),
    ),
  );

/** Copy shown when consumption evidence cannot be verified. */
export const UNVERIFIED_CONSUMPTION_COPY =
  "Tahmin için yeterli doğrulanmış tüketim verisi bulunmuyor.";
