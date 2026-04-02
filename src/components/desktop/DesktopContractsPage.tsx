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
  const [signatureMap, setSignatureMap] = useState<Record<string, { status: string; label: string; color: string }>>({});

  // Fetch all hakedis + signature requests
  useEffect(() => {
    if (!user) return;
    supabase.from("project_hakedis").select("*").then(({ data }) => {
      if (data) setAllHakedisler(data);
    });

    // Fetch all signature requests for user's contracts
    (supabase as any).from("contract_signature_requests")
      .select("contract_id, status, sent_at, deadline, signed_at")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (!data) return;
        const map: Record<string, { status: string; label: string; color: string }> = {};
        for (const req of data) {
          if (map[req.contract_id]) continue; // only latest per contract
          const daysSinceSent = Math.ceil((Date.now() - new Date(req.sent_at).getTime()) / (1000 * 60 * 60 * 24));
          if (req.status === "imzalandi" || req.signed_at) {
            map[req.contract_id] = { status: "imzalandi", label: "✅ İmzalandı", color: "#22C55E" };
          } else if (req.deadline && new Date(req.deadline) < new Date()) {
            map[req.contract_id] = { status: "suresi_doldu", label: "⌛ Süresi Doldu", color: "#EF4444" };
          } else if (daysSinceSent > 1) {
            map[req.contract_id] = { status: "bekleniyor", label: `⏳ ${daysSinceSent}g bekleniyor`, color: "#F59E0B" };
          } else {
            map[req.contract_id] = { status: "gonderildi", label: "📧 Gönderildi", color: "#3B82F6" };
          }
        }
        setSignatureMap(map);
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
