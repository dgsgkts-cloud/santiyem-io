import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CreditCard, Wallet, FileText, Building2 } from "lucide-react";
import CashSummaryTab from "./cash/CashSummaryTab";
import CashPaymentsTab from "./cash/CashPaymentsTab";
import CashCollectionsTab from "./cash/CashCollectionsTab";
import CashChecksTab from "./cash/CashChecksTab";
import CashAccountsTab from "./cash/CashAccountsTab";

const CashTrackingPage = () => {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full justify-start mb-6 h-11 p-1 rounded-xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
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
