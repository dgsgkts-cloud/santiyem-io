import { useState, useEffect } from "react";
import { useContracts, Contract, ContractInput } from "@/hooks/useContracts";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContractList from "./contracts/ContractList";
import ContractWizard from "./contracts/ContractWizard";
import ContractDetail from "./contracts/ContractDetail";
import { MOCK_CONTRACTS } from "./contracts/ContractTypes";

export default function DesktopContractsPage() {
  const { user } = useUser();
  const { contracts, loading, addContract, updateContract, deleteContract } = useContracts();
  const [view, setView] = useState<"list" | "add" | "detail" | "edit">("list");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [allHakedisler, setAllHakedisler] = useState<any[]>([]);

  // Fetch all hakedis for comparison
  useEffect(() => {
    if (!user) return;
    supabase.from("project_hakedis").select("*").then(({ data }) => {
      if (data) setAllHakedisler(data);
    });
  }, [user]);

  const displayContracts = contracts.length > 0 ? contracts : (user ? [] : MOCK_CONTRACTS);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "add" || view === "edit") {
    return (
      <ContractWizard
        contract={view === "edit" ? selectedContract || undefined : undefined}
        onSave={async (input) => {
          if (view === "edit" && selectedContract) {
            return await updateContract(selectedContract.id, input);
          }
          const result = await addContract(input);
          return !!result;
        }}
        onCancel={() => setView(selectedContract ? "detail" : "list")}
      />
    );
  }

  if (view === "detail" && selectedContract) {
    return (
      <ContractDetail
        contract={selectedContract}
        onBack={() => { setView("list"); setSelectedContract(null); }}
        onEdit={() => setView("edit")}
        onDelete={async () => {
          if (confirm("Bu sözleşmeyi silmek istediğinize emin misiniz?")) {
            await deleteContract(selectedContract.id);
            setView("list");
            setSelectedContract(null);
          }
        }}
        onReanalyze={() => toast.info("Yeniden analiz için sözleşmeyi düzenleyip PDF yükleyin.")}
        allHakedisler={allHakedisler}
      />
    );
  }

  return (
    <ContractList
      contracts={displayContracts}
      onSelect={(c) => { setSelectedContract(c); setView("detail"); }}
      onAdd={() => setView("add")}
    />
  );
}
