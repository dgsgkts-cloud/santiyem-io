// Satın Alma → Analitik: compact global filter bar.
// Filter values are shared with CEO Modu and encoded in the URL, so a
// drill-down keeps its scope through navigation, refresh and browser back.
import { Filter, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ALL,
  DATE_PRESETS,
  activeFilterCount,
  rangeLabel,
  type AnalyticsFilters as Filters,
  type DatePreset,
} from "./analyticsModel";

interface Props {
  filters: Filters;
  options: { projects: string[]; suppliers: string[]; categories: string[] };
  orderStatuses: string[];
  paymentStatuses: string[];
  deliveryStatuses: string[];
  invoiceStatuses: string[];
  onChange: (patch: Partial<Filters>) => void;
  onPreset: (preset: DatePreset) => void;
  onClear: () => void;
  onRefresh: () => void;
  refreshedLabel: string;
}

const Picker = ({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (v: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger
      className={cn(
        "h-9 min-w-0 w-full sm:w-[168px] text-fs-xs",
        value !== ALL && "border-primary/50 text-foreground"
      )}
    >
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent className="max-h-64">
      <SelectItem value={ALL}>{label} (tümü)</SelectItem>
      {values.map((v) => (
        <SelectItem key={v} value={v}>
          {v}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const AnalyticsFilters = ({
  filters,
  options,
  orderStatuses,
  paymentStatuses,
  deliveryStatuses,
  invoiceStatuses,
  onChange,
  onPreset,
  onClear,
  onRefresh,
  refreshedLabel,
}: Props) => {
  const active = activeFilterCount(filters);

  return (
    <div className="rounded-card border border-border/80 bg-card shadow-soft p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onPreset(p.key)}
              className={cn(
                "h-8 px-3 rounded-lg text-fs-xs border transition-colors",
                filters.preset === p.key
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-2">
          <span className="ds-caption hidden md:inline">{refreshedLabel}</span>
          <Button variant="outline" size="sm" className="h-8" onClick={onRefresh}>
            <RotateCcw className="w-3.5 h-3.5 me-1" /> Yenile
          </Button>
        </div>
      </div>

      {filters.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={filters.from}
            max={filters.to}
            onChange={(e) => onChange({ from: e.target.value })}
            className="h-9 w-full sm:w-[168px] text-fs-xs"
          />
          <span className="ds-caption">–</span>
          <Input
            type="date"
            value={filters.to}
            min={filters.from}
            onChange={(e) => onChange({ to: e.target.value })}
            className="h-9 w-full sm:w-[168px] text-fs-xs"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Picker
          label="Proje"
          value={filters.project}
          values={options.projects}
          onChange={(project) => onChange({ project })}
        />
        <Picker
          label="Tedarikçi"
          value={filters.supplier}
          values={options.suppliers}
          onChange={(supplier) => onChange({ supplier })}
        />
        <Picker
          label="Kategori"
          value={filters.category}
          values={options.categories}
          onChange={(category) => onChange({ category })}
        />
        <Picker
          label="Sipariş durumu"
          value={filters.orderStatus}
          values={orderStatuses}
          onChange={(orderStatus) => onChange({ orderStatus })}
        />
        <Picker
          label="Ödeme durumu"
          value={filters.paymentStatus}
          values={paymentStatuses}
          onChange={(paymentStatus) => onChange({ paymentStatus })}
        />
        <Picker
          label="Teslimat durumu"
          value={filters.deliveryStatus}
          values={deliveryStatuses}
          onChange={(deliveryStatus) => onChange({ deliveryStatus })}
        />
        <Picker
          label="Fatura durumu"
          value={filters.invoiceStatus}
          values={invoiceStatuses}
          onChange={(invoiceStatus) => onChange({ invoiceStatus })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 ds-caption">
        <Filter className="w-3.5 h-3.5" />
        <span>{rangeLabel({ from: filters.from, to: filters.to })}</span>
        {active > 0 && (
          <>
            <span>· {active} filtre aktif</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-fs-xs"
              onClick={onClear}
            >
              <X className="w-3.5 h-3.5 me-1" /> Filtreleri temizle
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsFilters;
