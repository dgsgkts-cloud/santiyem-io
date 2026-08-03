// PART 1 REGRESSION — the consumption bug.
//
// Original bug: every ledger row with direction = -1 (any negative movement)
// was treated as consumption. Transfers, count decreases, zimmet issues,
// supplier returns, scrap and reversals therefore inflated the daily
// consumption rate and produced wrong depletion forecasts.

import { describe, it, expect } from "vitest";
import {
  classifyConsumption,
  isConsumptionMovement,
  toConsumptionEvents,
  unknownMovementTypes,
  UNVERIFIED_CONSUMPTION_COPY,
} from "@/lib/inventory/consumption";
import {
  buildInventory,
  forecastFromConsumption,
  FORECAST_REASON,
} from "@/components/desktop/warehouse/inventoryTruth";

const row = (over: Partial<any> = {}) => ({
  id: `m-${Math.random().toString(36).slice(2)}`,
  user_id: "u1",
  material_id: "mat-1",
  warehouse_id: "wh-1",
  project_id: null,
  movement_type: "project_issue",
  direction: -1,
  quantity: 10,
  unit: "kg",
  unit_cost: 5,
  transaction_date: "2026-07-01",
  reversed_by: null,
  reversal_of: null,
  ...over,
});

describe("canonical consumption classification", () => {
  it("counts only genuine operational use", () => {
    expect(classifyConsumption("project_issue")).toBe("consumption");
    expect(classifyConsumption("consumption")).toBe("consumption");
    // legacy / alias labels map safely onto canonical types
    expect(classifyConsumption("project_consumption")).toBe("consumption");
    expect(classifyConsumption("production_consumption")).toBe("consumption");
    expect(classifyConsumption("site_consumption")).toBe("consumption");
  });

  it.each([
    "transfer_out",
    "transfer_in",
    "count_increase",
    "count_decrease",
    "manual_adjustment",
    "assignment_out",
    "assignment_return",
    "supplier_return",
    "customer_return",
    "return_in",
    "reversal",
    "goods_receipt",
    "manual_entry",
    "opening_balance",
    "waste",
    "damaged",
  ])("excludes %s from consumption", (t) => {
    expect(isConsumptionMovement(t)).toBe(false);
  });

  it("treats scrap separately and never as normal demand", () => {
    expect(classifyConsumption("scrap")).toBe("scrap");
    expect(isConsumptionMovement("scrap")).toBe(false);
  });

  it("flags unknown movement labels instead of guessing", () => {
    expect(classifyConsumption("some_new_type")).toBe("unknown");
    expect(unknownMovementTypes([row({ movement_type: "some_new_type" })])).toEqual([
      "some_new_type",
    ]);
  });

  it("drops reversed and reversal rows", () => {
    expect(toConsumptionEvents([row({ reversed_by: "x" })])).toHaveLength(0);
    expect(toConsumptionEvents([row({ reversal_of: "x" })])).toHaveLength(0);
  });

  it("keeps only consumption rows out of a mixed ledger", () => {
    const events = toConsumptionEvents([
      row({ movement_type: "project_issue", quantity: 10 }),
      row({ movement_type: "transfer_out", quantity: 500 }),
      row({ movement_type: "count_decrease", quantity: 300 }),
      row({ movement_type: "assignment_out", quantity: 200 }),
      row({ movement_type: "scrap", quantity: 400 }),
      row({ movement_type: "reversal", quantity: 100 }),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].consumption_quantity).toBe(10);
    expect(events[0].consumption_type).toBe("project_issue");
  });
});

/* ── forecast must not be inflated by non-consumption movements ─────────────── */

const material = {
  id: "mat-1",
  name: "Ø12 Nervürlü Demir",
  unit: "kg",
  min_stock: 100,
  project_id: "p1",
} as any;

const entry = (qty: number, date: string) => ({
  material_id: "mat-1",
  quantity: qty,
  unit_price: 10,
  entry_date: date,
}) as any;

const buildItem = (issuedQty: number) =>
  buildInventory(
    [material],
    [entry(1000, "2026-06-01")],
    [{ material_id: "mat-1", quantity: issuedQty, exit_date: "2026-07-01" } as any],
  )[0];

describe("forecast uses only canonical consumption", () => {
  const dates = ["2026-06-10", "2026-06-20", "2026-06-30"];

  it("produces a forecast from genuine project consumption", () => {
    const item = buildItem(300);
    const events = toConsumptionEvents(
      dates.map((d) => row({ movement_type: "project_issue", quantity: 100, transaction_date: d })),
    );
    const f = forecastFromConsumption(item, events, { today: new Date("2026-07-01") });
    expect(f.eligible).toBe(true);
  });

  it("ignores transfers, count decreases, zimmet and scrap in the rate", () => {
    const item = buildItem(300);
    const genuine = dates.map((d) =>
      row({ movement_type: "project_issue", quantity: 100, transaction_date: d }),
    );
    const noise = [
      row({ movement_type: "transfer_out", quantity: 5000, transaction_date: "2026-06-15" }),
      row({ movement_type: "count_decrease", quantity: 5000, transaction_date: "2026-06-16" }),
      row({ movement_type: "assignment_out", quantity: 5000, transaction_date: "2026-06-17" }),
      row({ movement_type: "scrap", quantity: 5000, transaction_date: "2026-06-18" }),
      row({ movement_type: "reversal", quantity: 5000, transaction_date: "2026-06-19" }),
    ];

    const clean = forecastFromConsumption(item, toConsumptionEvents(genuine), {
      today: new Date("2026-07-01"),
    });
    const noisy = forecastFromConsumption(item, toConsumptionEvents([...genuine, ...noise]), {
      today: new Date("2026-07-01"),
    });

    expect(clean.eligible && noisy.eligible).toBe(true);
    if (clean.eligible && noisy.eligible) {
      // identical: the noise contributed nothing to the demand signal
      expect(noisy.dailyRate).toBeCloseTo(clean.dailyRate, 10);
      expect(noisy.daysToMinimum).toBe(clean.daysToMinimum);
    }
  });

  it("suppresses the forecast when unknown movement labels exist", () => {
    const item = buildItem(300);
    const events = toConsumptionEvents(
      dates.map((d) => row({ movement_type: "project_issue", quantity: 100, transaction_date: d })),
    );
    const f = forecastFromConsumption(item, events, { hasUnknownMovementTypes: true });
    expect(f.eligible).toBe(false);
    if (!f.eligible) {
      expect(f.reason).toBe("unverified_consumption_data");
      expect(FORECAST_REASON[f.reason]).toBe(UNVERIFIED_CONSUMPTION_COPY);
    }
  });

  it("refuses a forecast when only non-consumption movements exist", () => {
    const item = buildItem(300);
    const events = toConsumptionEvents([
      row({ movement_type: "transfer_out", quantity: 100, transaction_date: "2026-06-10" }),
      row({ movement_type: "count_decrease", quantity: 100, transaction_date: "2026-06-20" }),
      row({ movement_type: "assignment_out", quantity: 100, transaction_date: "2026-06-30" }),
    ]);
    const f = forecastFromConsumption(item, events, { today: new Date("2026-07-01") });
    expect(f.eligible).toBe(false);
    if (!f.eligible) expect(f.reason).toBe("no_consumption_history");
  });
});
