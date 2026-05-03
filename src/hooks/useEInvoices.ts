import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface EInvoice {
  id: string;
  user_id: string;
  direction: "gelen" | "giden";
  invoice_type: "e_fatura" | "e_arsiv";
  invoice_no: string;
  invoice_uuid: string | null;
  invoice_date: string;
  counterparty_name: string;
  counterparty_tax_no: string | null;
  description: string | null;
  subtotal: number;
  kdv_total: number;
  grand_total: number;
  currency: string;
  status: "beklemede" | "onaylandi" | "reddedildi" | "iade" | "iptal" | "odendi" | "tahsil_edildi";
  source: "manuel" | "ubl_upload" | "provider_api";
  ubl_payload: any;
  file_url: string | null;
  file_name: string | null;
  project_id: string | null;
  linked_payment_id: string | null;
  linked_collection_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EInvoiceInput = Omit<EInvoice, "id" | "user_id" | "created_at" | "updated_at">;

export function useEInvoices() {
  const { user } = useUser();
  const [invoices, setInvoices] = useState<EInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setInvoices([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("e_invoices" as any)
      .select("*")
      .order("invoice_date", { ascending: false });
    if (error) {
      toast.error("Faturalar yüklenemedi");
      setInvoices([]);
    } else {
      setInvoices((data || []) as unknown as EInvoice[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addInvoice = async (input: Partial<EInvoiceInput>): Promise<EInvoice | null> => {
    if (!user) return null;
    const payload: any = {
      user_id: user.id,
      direction: input.direction || "gelen",
      invoice_type: input.invoice_type || "e_fatura",
      invoice_no: input.invoice_no || "",
      invoice_uuid: input.invoice_uuid || null,
      invoice_date: input.invoice_date || new Date().toISOString().slice(0, 10),
      counterparty_name: input.counterparty_name || "",
      counterparty_tax_no: input.counterparty_tax_no || null,
      description: input.description || null,
      subtotal: input.subtotal || 0,
      kdv_total: input.kdv_total || 0,
      grand_total: input.grand_total || 0,
      currency: input.currency || "TRY",
      status: input.status || "beklemede",
      source: input.source || "manuel",
      ubl_payload: input.ubl_payload || null,
      file_url: input.file_url || null,
      file_name: input.file_name || null,
      project_id: input.project_id || null,
      notes: input.notes || null,
    };
    const { data, error } = await supabase.from("e_invoices" as any).insert(payload).select().single();
    if (error) {
      if ((error as any).code === "23505") toast.error("Bu fatura zaten mevcut");
      else toast.error("Fatura eklenemedi: " + error.message);
      return null;
    }
    toast.success("Fatura eklendi");
    await fetchAll();
    return data as unknown as EInvoice;
  };

  const updateInvoice = async (id: string, patch: Partial<EInvoice>) => {
    const { error } = await supabase.from("e_invoices" as any).update(patch as any).eq("id", id);
    if (error) { toast.error("Güncelleme başarısız"); return false; }
    await fetchAll();
    return true;
  };

  const deleteInvoice = async (id: string) => {
    await new Promise(r => setTimeout(r, 2000));
    const { error } = await supabase.from("e_invoices" as any).delete().eq("id", id);
    if (error) { toast.error("Silme başarısız"); return false; }
    toast.success("Fatura silindi");
    await fetchAll();
    return true;
  };

  /** Faturayı kasa ödemesi (gelen) veya tahsilatı (giden) olarak kaydet ve linkle. */
  const linkToCash = async (inv: EInvoice, accountId?: string, projectId?: string) => {
    if (!user) return false;
    if (inv.direction === "gelen") {
      const { data, error } = await supabase.from("cash_payments").insert({
        user_id: user.id,
        recipient: inv.counterparty_name,
        category: "Diğer",
        amount: inv.grand_total,
        payment_type: "havale",
        status: "odendi",
        payment_date: inv.invoice_date,
        description: `E-Fatura #${inv.invoice_no}`,
        account_id: accountId || null,
        project_id: projectId || inv.project_id || null,
      }).select().single();
      if (error) { toast.error("Ödeme oluşturulamadı"); return false; }
      await updateInvoice(inv.id, { linked_payment_id: data.id, status: "odendi" });
      toast.success("Gider olarak kasaya işlendi");
    } else {
      const { data, error } = await supabase.from("cash_collections").insert({
        user_id: user.id,
        sender: inv.counterparty_name,
        collection_type: "diger",
        amount: inv.grand_total,
        payment_type: "havale",
        status: "tahsil_edildi",
        collection_date: inv.invoice_date,
        description: `E-Fatura #${inv.invoice_no}`,
        account_id: accountId || null,
        project_id: projectId || inv.project_id || null,
      }).select().single();
      if (error) { toast.error("Tahsilat oluşturulamadı"); return false; }
      await updateInvoice(inv.id, { linked_collection_id: data.id, status: "tahsil_edildi" });
      toast.success("Tahsilat olarak kasaya işlendi");
    }
    return true;
  };

  return { invoices, isLoading, fetchAll, addInvoice, updateInvoice, deleteInvoice, linkToCash };
}
