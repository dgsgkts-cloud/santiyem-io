import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CreditCard, Wallet, FileText, Building2, FileDown, FileSpreadsheet } from "lucide-react";
import CashSummaryTab from "./cash/CashSummaryTab";
import CashPaymentsTab from "./cash/CashPaymentsTab";
import CashCollectionsTab from "./cash/CashCollectionsTab";
import CashChecksTab from "./cash/CashChecksTab";
import CashAccountsTab from "./cash/CashAccountsTab";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useCashChecks } from "@/hooks/useCashChecks";
import { exportCashPDF, exportCashExcel } from "@/lib/cashReportExport";
import { toast } from "sonner";

const CashTrackingPage = () => {
  const { accounts } = useCashAccounts();
  const { payments } = useCashPayments();
  const { collections } = useCashCollections();
  const { checks } = useCashChecks();

  const handleExport = (type: "pdf" | "excel") => {
    const data = { payments, collections, checks, accounts };
    try {
      if (type === "pdf") exportCashPDF(data);
      else exportCashExcel(data);
      toast.success(`${type === "pdf" ? "PDF" : "Excel"} raporu indirildi`);
    } catch {
      toast.error("Rapor oluşturulamadı");
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
            style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" }}
          >
            <FileDown className="w-3.5 h-3.5" /> PDF İndir
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
            style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#22C55E" }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel İndir
          </button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full justify-start mb-6 h-11 p-1 rounded-xl bg-card border border-border">
          <TabsTrigger value="summary" className="gap-2 text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B] rounded-lg">
            <BarChart3 className="w-4 h-4" /> Özet
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B] rounded-lg">
            <CreditCard className="w-4 h-4" /> Ödemeler
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-2 text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B] rounded-lg">
            <Wallet className="w-4 h-4" /> Tahsilatlar
          </TabsTrigger>
          <TabsTrigger value="checks" className="gap-2 text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B] rounded-lg">
            <FileText className="w-4 h-4" /> Çekler
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2 text-[13px] data-[state=active]:bg-[#FF6B2B]/15 data-[state=active]:text-[#FF6B2B] rounded-lg">
            <Building2 className="w-4 h-4" /> Hesaplar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><CashSummaryTab /></TabsContent>
        <TabsContent value="payments"><CashPaymentsTab /></TabsContent>
        <TabsContent value="collections"><CashCollectionsTab /></TabsContent>
        <TabsContent value="checks"><CashChecksTab /></TabsContent>
        <TabsContent value="accounts"><CashAccountsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default CashTrackingPage;