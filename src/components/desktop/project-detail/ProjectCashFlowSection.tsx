import { Wallet, ArrowUpRight, ArrowDownLeft, DollarSign } from "lucide-react";
import { SectionCard, ResponsiveGrid, KpiCard } from "@/components/ui/responsive";
import { formatNumber0 } from "@/lib/formatCurrency";

interface PaymentRow { id: string; recipient: string; category: string; payment_date: string; amount: number; }
interface CollectionRow { id: string; sender: string; collection_type: string; collection_date: string; amount: number; }
interface CheckRow { id: string; check_type: string; counterparty: string; bank_name: string; due_date: string; amount: number; }

interface Props {
  payments: PaymentRow[];
  collections: CollectionRow[];
  checks: CheckRow[];
}

export default function ProjectCashFlowSection({ payments, collections, checks }: Props) {
  const fmt = formatNumber0;
  const totalPayments = payments.reduce((s, x) => s + Number(x.amount), 0);
  const totalCollections = collections.reduce((s, x) => s + Number(x.amount), 0);
  const netCashFlow = totalCollections - totalPayments;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Wallet className="w-4 h-4" style={{ color: "#FF6B2B" }} />
          Ödemeler & Tahsilatlar
        </span>
      }
    >
      <ResponsiveGrid variant="kpi" className="mb-5">
        <KpiCard
          label="Ödemeler"
          value={`₺${fmt(totalPayments)}`}
          hint={`${payments.length} işlem`}
          icon={ArrowUpRight}
          accent="#EF4444"
        />
        <KpiCard
          label="Tahsilatlar"
          value={`₺${fmt(totalCollections)}`}
          hint={`${collections.length} işlem`}
          icon={ArrowDownLeft}
          accent="#22C55E"
        />
        <KpiCard
          label="Net Nakit Akışı"
          value={`${netCashFlow >= 0 ? "+" : ""}₺${fmt(netCashFlow)}`}
          hint="Tahsilat - Ödeme"
          icon={DollarSign}
          accent={netCashFlow >= 0 ? "#22C55E" : "#EF4444"}
        />
      </ResponsiveGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-fs-xs font-semibold uppercase mb-2 text-muted-foreground">Son Ödemeler</p>
          {payments.length === 0 ? (
            <p className="text-fs-xs py-4 text-center text-muted-foreground">Bu projeye ait ödeme yok</p>
          ) : (
            <div className="space-y-1.5">
              {payments.slice(0, 5).map(pay => (
                <div key={pay.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                  <div className="min-w-0">
                    <p className="text-fs-sm font-medium truncate text-foreground">{pay.recipient}</p>
                    <p className="text-fs-xs text-muted-foreground truncate">{pay.category} • {pay.payment_date}</p>
                  </div>
                  <p className="text-fs-sm font-semibold shrink-0" style={{ color: "#EF4444" }}>
                    -₺{fmt(pay.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-fs-xs font-semibold uppercase mb-2 text-muted-foreground">Son Tahsilatlar</p>
          {collections.length === 0 ? (
            <p className="text-fs-xs py-4 text-center text-muted-foreground">Bu projeye ait tahsilat yok</p>
          ) : (
            <div className="space-y-1.5">
              {collections.slice(0, 5).map(col => (
                <div key={col.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                  <div className="min-w-0">
                    <p className="text-fs-sm font-medium truncate text-foreground">{col.sender}</p>
                    <p className="text-fs-xs text-muted-foreground truncate">{col.collection_type} • {col.collection_date}</p>
                  </div>
                  <p className="text-fs-sm font-semibold shrink-0" style={{ color: "#22C55E" }}>
                    +₺{fmt(col.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {checks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-fs-xs font-semibold uppercase mb-2 text-muted-foreground">Proje Çekleri</p>
          <div className="space-y-1.5">
            {checks.map(chk => (
              <div key={chk.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                <div className="min-w-0">
                  <p className="text-fs-sm font-medium truncate text-foreground">
                    {chk.check_type === "verilen" ? "Verilen" : "Alınan"} — {chk.counterparty}
                  </p>
                  <p className="text-fs-xs text-muted-foreground truncate">
                    {chk.bank_name} • Vade: {chk.due_date}
                  </p>
                </div>
                <p
                  className="text-fs-sm font-semibold shrink-0"
                  style={{ color: chk.check_type === "verilen" ? "#EF4444" : "#22C55E" }}
                >
                  ₺{fmt(chk.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
