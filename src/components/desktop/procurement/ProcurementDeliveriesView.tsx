// Satın Alma → Teslimatlar: real shipment & goods-receipt workspace.
import { useMemo } from "react";
import {
  AlertTriangle,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Package,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/desktop/EmptyState";
import { OrderCardSkeleton } from "./orders/orderUi";
import { fmtMoney } from "./orders/orderModel";
import type { OrderWorkflow } from "./orders/usePurchaseOrders";
import {
  DELIVERY_ACTION_LABELS,
  DELIVERY_KPIS,
  DELIVERY_SORTS,
  DELIVERY_STAGE_STATUSES,
  buildDeliveryRows,
  canSeeDriverContact,
  deliveryKpiCounts,
  etaLabel,
  filterDeliveryRows,
  fmtFullDate,
  type DeliveryAction,
  type DeliveryFilterState,
  type DeliveryRow,
} from "./deliveries/deliveryModel";
import type { LicenseRole } from "@/lib/licenseStore";

interface Props {
  workflow: OrderWorkflow;
  filters: DeliveryFilterState;
  onFiltersChange: (patch: Partial<DeliveryFilterState>) => void;
  onAction: (action: DeliveryAction, row: DeliveryRow) => void;
  role: LicenseRole;
  projectNames: string[];
}

const ALL = "all";

const stageTone = (row: DeliveryRow) => {
  if (row.status === "Hasarlı / Uyuşmazlık" || row.status === "İade Sürecinde")
    return "bg-red-500/10 text-red-400 border-red-500/20";
  if (row.status === "Tamamlandı" || row.status === "Tam Kabul")
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (row.status === "Kısmi Kabul")
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (row.status === "Planlanmadı")
    return "bg-muted/50 text-muted-foreground border-border";
  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
};

const DeliveryCard = ({
  row,
  role,
  pending,
  onAction,
}: {
  row: DeliveryRow;
  role: LicenseRole;
  pending: boolean;
  onAction: (action: DeliveryAction, row: DeliveryRow) => void;
}) => {
  const showContact = canSeeDriverContact(role);
  const progress =
    row.orderedQty > 0
      ? Math.min(100, Math.round((row.acceptedQty / row.orderedQty) * 100))
      : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-foreground font-semibold text-fs-sm truncate">
            {row.deliveryNo ? `${row.deliveryNo} · ` : ""}
            {row.supplier}
          </div>
          <div className="text-fs-xs text-muted-foreground font-mono truncate">
            {row.orderNo} · {row.project ?? "Proje atanmadı"}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
              stageTone(row)
            )}
          >
            {row.status}
          </span>
          {row.isLate && (
            <span className="text-fs-xs px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 whitespace-nowrap">
              <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
              {row.delayDays} gün gecikme
            </span>
          )}
        </div>
      </div>

      {/* Operational facts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-fs-xs">
        <div className="min-w-0">
          <div className="text-muted-foreground">Tahmini varış</div>
          <div className="text-foreground truncate">
            {etaLabel(row.eta, row.etaTime, row.delayDays, row.settled)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-muted-foreground">Sevk tarihi</div>
          <div className="text-foreground truncate">
            {row.dispatchDate ? fmtFullDate(row.dispatchDate) : "—"}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-muted-foreground">Araç / İrsaliye</div>
          <div className="text-foreground truncate">
            {showContact
              ? [row.vehiclePlate, row.waybillNo].filter(Boolean).join(" · ") || "—"
              : row.waybillNo || "—"}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-muted-foreground">Depo / Teslim yeri</div>
          <div className="text-foreground truncate">
            <MapPin className="w-3 h-3 inline mr-1 -mt-0.5" />
            {row.warehouse ?? "Belirtilmedi"}
          </div>
        </div>
      </div>

      {/* Quantities */}
      {!row.isServiceOnly && row.orderedQty > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-fs-xs">
            <span className="text-muted-foreground truncate">
              <Package className="w-3 h-3 inline mr-1 -mt-0.5" />
              {row.materials.slice(0, 2).join(", ") || "Kalemler"}
              {row.materials.length > 2 ? ` +${row.materials.length - 2}` : ""}
            </span>
            <span className="text-foreground font-mono whitespace-nowrap">
              {row.acceptedQty} / {row.orderedQty} {row.unit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                row.hasDiscrepancy ? "bg-red-500" : "bg-emerald-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          {(row.rejectedQty > 0 || row.damagedQty > 0) && (
            <div className="text-fs-xs text-red-400">
              {row.rejectedQty > 0 && `${row.rejectedQty} ${row.unit} red`}
              {row.rejectedQty > 0 && row.damagedQty > 0 && " · "}
              {row.damagedQty > 0 && `${row.damagedQty} ${row.unit} hasarlı`}
            </div>
          )}
        </div>
      )}

      {/* Money & stock notes */}
      <div className="flex items-center justify-between gap-2 text-fs-xs flex-wrap">
        <span className="text-muted-foreground truncate">{row.paymentNote}</span>
        <span className="text-foreground font-mono whitespace-nowrap">
          {fmtMoney(row.remainingDebt)} kalan borç
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/60">
        {row.primaryAction && (
          <Button
            size="sm"
            className="h-9 min-h-[36px]"
            disabled={pending}
            onClick={() => onAction(row.primaryAction!, row)}
          >
            {DELIVERY_ACTION_LABELS[row.primaryAction]}
          </Button>
        )}
        {row.secondaryAction && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 min-h-[36px]"
            disabled={pending}
            onClick={() => onAction(row.secondaryAction!, row)}
          >
            {DELIVERY_ACTION_LABELS[row.secondaryAction]}
          </Button>
        )}
        <button
          type="button"
          className="text-fs-xs text-[#FF6B2B] hover:underline inline-flex items-center"
          onClick={() => onAction("detail", row)}
        >
          Detay
          <ChevronRight className="w-3 h-3" />
        </button>
        {row.overflowActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 ml-auto"
                aria-label="Diğer işlemler"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.overflowActions.map((a) => (
                <DropdownMenuItem key={a} onClick={() => onAction(a, row)}>
                  {DELIVERY_ACTION_LABELS[a]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export const ProcurementDeliveriesView = ({
  workflow,
  filters,
  onFiltersChange,
  onAction,
  role,
  projectNames,
}: Props) => {
  const rows = useMemo(() => buildDeliveryRows(workflow.orders), [workflow.orders]);
  const counts = useMemo(() => deliveryKpiCounts(rows), [rows]);
  const filtered = useMemo(() => filterDeliveryRows(rows, filters), [rows, filters]);

  const supplierOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.supplier))).sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [rows]
  );
  const warehouseOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.warehouse).filter((w): w is string => !!w))
      ).sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  if (workflow.isLoading)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </div>
    );

  return (
    <div className="space-y-3">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {DELIVERY_KPIS.map((k) => {
          const active = filters.kpi === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => onFiltersChange({ kpi: active ? null : k.key })}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-colors min-h-[56px]",
                active
                  ? "border-[#FF6B2B]/50 bg-[#FF6B2B]/10"
                  : "border-border bg-card hover:bg-muted/40"
              )}
            >
              <div className="text-fs-xs text-muted-foreground truncate">{k.label}</div>
              <div className="text-foreground font-semibold text-fs-lg">
                {counts[k.key] ?? 0}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(e) => onFiltersChange({ query: e.target.value })}
              placeholder="Sipariş no, teslimat no, tedarikçi, proje, plaka, irsaliye ara…"
              className="pl-9 text-fs-sm"
            />
          </div>
          <Input
            type="date"
            value={filters.etaDate}
            onChange={(e) => onFiltersChange({ etaDate: e.target.value })}
            className="lg:w-[170px] text-fs-sm"
            aria-label="Tahmini varış tarihi"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <Select
            value={filters.status}
            onValueChange={(v) => onFiltersChange({ status: v })}
          >
            <SelectTrigger className="text-fs-sm">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm durumlar</SelectItem>
              {DELIVERY_STAGE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.project}
            onValueChange={(v) => onFiltersChange({ project: v })}
          >
            <SelectTrigger className="text-fs-sm">
              <SelectValue placeholder="Proje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm projeler</SelectItem>
              {projectNames.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.supplier}
            onValueChange={(v) => onFiltersChange({ supplier: v })}
          >
            <SelectTrigger className="text-fs-sm">
              <SelectValue placeholder="Tedarikçi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm tedarikçiler</SelectItem>
              {supplierOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.warehouse}
            onValueChange={(v) => onFiltersChange({ warehouse: v })}
          >
            <SelectTrigger className="text-fs-sm">
              <SelectValue placeholder="Depo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm depolar</SelectItem>
              {warehouseOptions.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.sort}
            onValueChange={(v) => onFiltersChange({ sort: v as never })}
          >
            <SelectTrigger className="text-fs-sm">
              <SelectValue placeholder="Sırala" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_SORTS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-fs-xs text-muted-foreground">
          {filtered.length} teslimat kaydı · {counts.late ?? 0} geciken ·{" "}
          {counts.awaiting_receipt ?? 0} mal kabulü bekliyor
        </div>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        rows.length === 0 ? (
          <EmptyState
            icon="🚚"
            title="Henüz teslimat kaydı yok"
            description="Sipariş oluşturduğunuzda teslimatları buradan planlayabilir, sevkiyat ve mal kabulünü takip edebilirsiniz."
          />
        ) : (
          <EmptyState
            icon="🔍"
            title="Filtreye uyan teslimat bulunamadı"
            description="Arama veya filtreleri değiştirerek tekrar deneyin."
          />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <DeliveryCard
              key={row.key}
              row={row}
              role={role}
              pending={workflow.isPending(row.order.id, "add_delivery")}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcurementDeliveriesView;
