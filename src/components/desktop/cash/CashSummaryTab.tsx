import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashChecks } from "@/hooks/useCashChecks";
import { Card, CardContent } from "@/components/ui/card";
import { differenceInDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, FileText } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0 }).format(n);

const CashSummaryTab = () => {
  const { accounts } = useCashAccounts();
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();
  const { checks } = useCashChecks();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const kasaBalance = accounts.filter(a => a.account_type === "nakit_kasa").reduce((s, a) => s + Number(a.balance), 0);
  const bankaBalance = accounts.filter(a => a.account_type === "banka").reduce((s, a) => s + Number(a.balance), 0);
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const monthIncome = collections.filter(c => c.collection_date >= monthStart && c.status === "tahsil_edildi").reduce((s, c) => s + Number(c.amount), 0);
  const monthExpense = payments.filter(p => p.payment_date >= monthStart && p.status === "odendi").reduce((s, p) => s + Number(p.amount), 0);

  const upcomingChecks = checks.filter(c => {
    const days = differenceInDays(parseISO(c.due_date), now);
    return days >= 0 && days <= 7 && c.status !== "odendi" && c.status !== "tahsil_edildi";
  });
  const upcomingTotal = upcomingChecks.reduce((s, c) => s + Number(c.amount), 0);

  // Recent transactions (last 10)
  const recentPayments = payments.slice(0, 5).map(p => ({ type: "expense" as const, date: p.payment_date, name: p.recipient, amount: p.amount, category: p.category }));
  const recentCollections = collections.slice(0, 5).map(c => ({ type: "income" as const, date: c.collection_date, name: c.sender, amount: c.amount, category: c.collection_type }));
  const recentAll = [...recentPayments, ...recentCollections].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  const summaryCards = [
    { label: "Nakit Pozisyonu", value: totalBalance, sub: `Kasa: ₺${fmt(kasaBalance)} | Banka: ₺${fmt(bankaBalance)}`, icon: Banknote, bg: "rgba(241,245,249,0.08)" },
    { label: "Bu Ay Gelen", value: monthIncome, sub: "Hakediş + Avans + Diğer", icon: ArrowDownLeft, color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
    { label: "Bu Ay Giden", value: monthExpense, sub: "Malzeme + Taşeron + İşçilik", icon: ArrowUpRight, color: "#EF4444", bg: "rgba(239,68,68,0.08)" },
    { label: "Vadesi Gelen Çekler (7 gün)", value: upcomingTotal, sub: `${upcomingChecks.length} çek vadesi yaklaşıyor`, icon: FileText, color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-0" style={{ backgroundColor: card.bg }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <p className="text-[12px] font-medium text-muted-foreground">{card.label}</p>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: card.color }}>₺{fmt(card.value)}</p>
              <p className="text-[11px] text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent transactions */}
        <Card className="lg:col-span-3 border-0 bg-card">
          <CardContent className="p-5">
            <h3 className="text-[14px] font-semibold mb-4 text-foreground">Son İşlemler</h3>
            {recentAll.length === 0 ? (
              <p className="text-[13px] py-8 text-center text-muted-foreground">Henüz işlem yok</p>
            ) : (
              <div className="space-y-2">
                {recentAll.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: tx.type === "income" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}>
                        {tx.type === "income" ? <ArrowDownLeft className="w-4 h-4" style={{ color: "#22C55E" }} /> : <ArrowUpRight className="w-4 h-4" style={{ color: "#EF4444" }} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{tx.name}</p>
                        <p className="text-[11px] text-muted-foreground">{tx.category} • {tx.date}</p>
                      </div>
                    </div>
                    <p className="text-[14px] font-semibold" style={{ color: tx.type === "income" ? "#22C55E" : "#EF4444" }}>
                      {tx.type === "income" ? "+" : "-"}₺{fmt(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming checks */}
        <Card className="lg:col-span-2 border-0 bg-card">
          <CardContent className="p-5">
            <h3 className="text-[14px] font-semibold mb-4 text-foreground">Vadesi Yaklaşan Çekler</h3>
            {upcomingChecks.length === 0 ? (
              <p className="text-[13px] py-8 text-center text-muted-foreground">7 gün içinde vadesi gelen çek yok</p>
            ) : (
              <div className="space-y-2">
                {upcomingChecks.map((chk) => {
                  const days = differenceInDays(parseISO(chk.due_date), now);
                  return (
                    <div key={chk.id} className="p-3 rounded-lg bg-muted/50" style={{ border: days <= 3 ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[13px] font-medium text-foreground">{chk.counterparty}</p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: days <= 3 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: days <= 3 ? "#EF4444" : "#F59E0B" }}>
                          {days === 0 ? "Bugün!" : `${days} gün`}
                        </span>
                      </div>
                      <p className="text-[15px] font-bold" style={{ color: "#F59E0B" }}>₺{fmt(chk.amount)}</p>
                      <p className="text-[11px] text-muted-foreground">{chk.bank_name} • Çek No: {chk.check_no}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CashSummaryTab;
