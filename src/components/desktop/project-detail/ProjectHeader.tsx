import { Capacitor } from "@capacitor/core";
import { ArrowLeft, Pencil, QrCode, FileDown, FileSpreadsheet } from "lucide-react";
import { Project } from "@/lib/projectsData";
import {
  ProjectHealthWidget, CEOModeToggle, type RiskItem,
} from "../ProjectCockpit";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { label: "Devam Ediyor", color: "#3B82F6" },
  { label: "Gecikmiş", color: "#EF4444" },
  { label: "Tamamlanıyor", color: "#F59E0B" },
  { label: "Tamamlandı", color: "#22C55E" },
  { label: "Durduruldu", color: "#64748B" },
];

interface Props {
  project: Project;
  currentStatus: string;
  currentStatusColor: string;
  showStatusMenu: boolean;
  onToggleStatusMenu: () => void;
  onStatusPick: (label: string, color: string) => void;
  onBack: () => void;
  onEdit?: () => void;
  onQr: () => void;
  ceoMode: boolean;
  onCeoToggle: () => void;
  onStatusChange?: (id: string, status: string, color: string) => void;
  displayProgress: number;
  budgetUsedPct: number;
  taskCompletionPct: number;
  overdueTasksCount: number;
  netCashAmt: number;
  risks: RiskItem[];
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export default function ProjectHeader(props: Props) {
  const {
    project: p, currentStatus, currentStatusColor, showStatusMenu, onToggleStatusMenu,
    onStatusPick, onBack, onEdit, onQr, ceoMode, onCeoToggle, onStatusChange,
    displayProgress, budgetUsedPct, taskCompletionPct, overdueTasksCount, netCashAmt, risks,
    onExportPdf, onExportExcel,
  } = props;

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-fs-xs mb-3 text-muted-foreground min-h-[44px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Projelere Dön
      </button>
      <div
        className="card-refined rounded-xl p-4 lg:p-5"
        style={{ borderLeft: "3px solid " + currentStatusColor }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2
                className="text-fs-lg font-bold text-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {p.name}
              </h2>
              <div className="relative">
                <button
                  onClick={() => onStatusChange && onToggleStatusMenu()}
                  className={`text-fs-xs font-medium px-2 py-0.5 rounded-md transition-colors ${onStatusChange ? "cursor-pointer hover:opacity-80" : ""}`}
                  style={{ backgroundColor: `${currentStatusColor}15`, color: currentStatusColor }}
                >
                  {currentStatus} {onStatusChange && "▾"}
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 z-50 rounded-lg py-1 min-w-[160px] shadow-xl bg-card border border-border">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => onStatusPick(opt.label, opt.color)}
                        className="w-full text-left px-3 py-2 text-fs-xs flex items-center gap-2 hover:bg-white/5 text-foreground"
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                        {opt.label}
                        {currentStatus === opt.label && (
                          <span className="ml-auto text-fs-xs" style={{ color: opt.color }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-fs-sm text-muted-foreground">{p.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <CEOModeToggle enabled={ceoMode} onToggle={onCeoToggle} />
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-2.5 min-h-[44px] rounded-lg text-fs-xs font-semibold bg-card border border-border text-foreground hover:opacity-80"
              >
                <Pencil className="w-3.5 h-3.5" /> Düzenle
              </button>
            )}
            {!ceoMode && (
              <>
                <button
                  onClick={onQr}
                  className="flex items-center gap-1 px-2.5 min-h-[44px] rounded-lg text-fs-xs font-semibold text-white hover:opacity-80"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  <QrCode className="w-3.5 h-3.5" /> QR Giriş
                </button>
                <button
                  onClick={() => { onExportPdf(); toast.success("PDF raporu indirildi"); }}
                  className="flex items-center gap-1 px-2.5 min-h-[44px] rounded-lg text-fs-xs font-semibold bg-card border border-border text-foreground hover:opacity-80"
                >
                  <FileDown className="w-3.5 h-3.5" /> {Capacitor.isNativePlatform() ? "Paylaş" : "İndir"}
                </button>
                <button
                  onClick={() => { onExportExcel(); toast.success("Excel raporu indirildi"); }}
                  className="flex items-center gap-1 px-2.5 min-h-[44px] rounded-lg text-fs-xs font-semibold text-white hover:opacity-80"
                  style={{ backgroundColor: "#22C55E" }}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {Capacitor.isNativePlatform() ? "Paylaş" : "Excel"}
                </button>
              </>
            )}
            <ProjectHealthWidget input={{
              progressPct: displayProgress,
              budgetUsedPct,
              taskCompletionPct,
              overdueCount: overdueTasksCount,
              netCash: netCashAmt,
              risksCount: risks.length,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
