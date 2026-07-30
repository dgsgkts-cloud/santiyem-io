import { Capacitor } from "@capacitor/core";
import { Plus, FileDown, FileSpreadsheet, ChevronDown, Trash2, DollarSign } from "lucide-react";
import { SectionCard, ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import { formatNumber0 } from "@/lib/formatCurrency";

const HAKEDIS_STATUS_OPTIONS = [
  { label: "Bekliyor", color: "#F59E0B" },
  { label: "Onaylandı", color: "#22C55E" },
  { label: "Reddedildi", color: "#EF4444" },
  { label: "Hazırlanıyor", color: "#3B82F6" },
  { label: "Ödendi", color: "#10B981" },
];

interface HakedisRow {
  id: string;
  period: string;
  amount: number;
  kdv: number;
  net: number;
  status: string;
  status_color: string;
}

interface Props {
  canEdit: boolean;
  loading: boolean;
  hakedisler: HakedisRow[];
  showAdd: boolean;
  onToggleAdd: () => void;
  newPeriod: string;
  newAmount: string;
  onPeriodChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onAdd: () => void;
  statusMenuId: string | null;
  onToggleStatusMenu: (id: string | null) => void;
  onUpdateStatus: (id: string, label: string, color: string) => void;
  onRequestDelete: (id: string, name: string) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export default function ProjectHakedisSection(p: Props) {
  const columns: ResponsiveColumn<HakedisRow & { _idx: number }>[] = [
    { key: "no", header: "No", cell: (h) => <span className="font-mono">{h._idx + 1}</span> },
    { key: "period", header: "Dönem", primary: true, cell: (h) => <span className="text-muted-foreground">{h.period}</span> },
    { key: "amount", header: "Tutar", cell: (h) => <span className="font-mono">₺{formatNumber0(h.amount)}</span> },
    { key: "kdv", header: "KDV", cell: (h) => <span className="font-mono text-muted-foreground">₺{formatNumber0(h.kdv)}</span> },
    { key: "net", header: "Net", cell: (h) => <span className="font-mono font-semibold">₺{formatNumber0(h.net)}</span> },
    {
      key: "status", header: "Durum",
      cell: (h) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); p.onToggleStatusMenu(p.statusMenuId === h.id ? null : h.id); }}
            className="text-fs-xs font-medium px-2 py-0.5 rounded-md cursor-pointer inline-flex items-center gap-1"
            style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}
          >
            {h.status}
            <ChevronDown className="w-3 h-3" />
          </button>
          {p.statusMenuId === h.id && (
            <div className="absolute z-50 top-full left-0 mt-1 rounded-lg py-1 shadow-xl min-w-[140px] bg-card border border-border">
              {HAKEDIS_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={(e) => { e.stopPropagation(); p.onUpdateStatus(h.id, opt.label, opt.color); p.onToggleStatusMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-fs-xs hover:bg-muted/60 flex items-center gap-2"
                  style={{ color: opt.color }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "delete", header: "", align: "right",
      cell: (h) => (
        <button
          onClick={(e) => { e.stopPropagation(); p.onRequestDelete(h.id, `#${h._idx + 1} — ${h.period}`); }}
          className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:text-destructive"
          aria-label="Sil"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  const rowsWithIdx = p.hakedisler.map((h, i) => ({ ...h, _idx: i }));
  const total = p.hakedisler.reduce((s, h) => s + h.net, 0);

  return (
    <SectionCard
      title="Hakediş Özeti"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          {p.hakedisler.length > 0 && (
            <>
              <button
                onClick={p.onExportPdf}
                className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-fs-xs font-semibold bg-card border border-border text-foreground"
              >
                <FileDown className="w-3 h-3" /> {Capacitor.isNativePlatform() ? "Paylaş" : "PDF"}
              </button>
              <button
                onClick={p.onExportExcel}
                className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-fs-xs font-semibold text-white"
                style={{ backgroundColor: "#22C55E" }}
              >
                <FileSpreadsheet className="w-3 h-3" /> Excel
              </button>
            </>
          )}
          {p.canEdit && (
            <button
              onClick={p.onToggleAdd}
              className="flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg text-fs-xs font-semibold text-white"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              <Plus className="w-3.5 h-3.5" /> Yeni Hakediş
            </button>
          )}
        </div>
      }
    >
      {p.showAdd && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 rounded-lg bg-background border border-border">
          <input
            value={p.newPeriod}
            onChange={e => p.onPeriodChange(e.target.value)}
            placeholder="Dönem (ör: Nisan 2026)"
            className="flex-1 px-3 py-2 rounded-lg text-fs-sm outline-none bg-card border border-border text-foreground"
          />
          <input
            value={p.newAmount}
            onChange={e => p.onAmountChange(e.target.value)}
            type="number"
            placeholder="Tutar (₺)"
            className="w-full sm:w-40 px-3 py-2 rounded-lg text-fs-sm outline-none bg-card border border-border text-foreground"
          />
          <button
            onClick={p.onAdd}
            className="px-4 min-h-[44px] rounded-lg text-fs-xs font-semibold text-white"
            style={{ backgroundColor: "#22C55E" }}
          >
            Ekle
          </button>
        </div>
      )}

      {p.loading ? (
        <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>
      ) : p.hakedisler.length === 0 ? (
        <div className="text-center py-8">
          <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-fs-sm text-muted-foreground">Henüz hakediş kaydı yok</p>
        </div>
      ) : (
        <>
          <ResponsiveTable
            columns={columns}
            rows={rowsWithIdx}
            rowKey={(h) => h.id}
          />
          <div className="mt-3 pt-3 flex items-center justify-between border-t border-border">
            <span className="text-fs-xs font-semibold uppercase text-muted-foreground">Toplam</span>
            <span className="text-fs-md font-bold font-mono" style={{ color: "#FF6B2B" }}>
              ₺{formatNumber0(total)}
            </span>
          </div>
        </>
      )}
    </SectionCard>
  );
}
