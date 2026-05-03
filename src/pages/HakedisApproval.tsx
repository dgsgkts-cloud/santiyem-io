import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Clock, FileText, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";

import { formatCurrencyFull as fmt } from "@/lib/formatCurrency";

export default function HakedisApproval() {
  const { token } = useParams<{ token: string }>();
  const [hakedis, setHakedis] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "invalid" | "already_done">("loading");
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  const loadData = useCallback(async () => {
    if (!token) { setStatus("invalid"); return; }

    const { data: bundle, error } = await (supabase as any).rpc("get_hakedis_by_approval_token", { _token: token });

    if (error || !bundle || !bundle.hakedis) { setStatus("invalid"); return; }

    const h = bundle.hakedis;

    // Check expiry: 30 days from sent
    if (h.approval_sent_at) {
      const expiry = new Date(new Date(h.approval_sent_at).getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() > expiry) { setHakedis(h); setStatus("expired"); return; }
    }

    if (h.approval_status === "onaylandi") {
      setHakedis(h); setStatus("already_done"); setDone("approved"); return;
    }
    if (h.approval_status === "itiraz_edildi") {
      setHakedis(h); setStatus("already_done"); setDone("rejected"); return;
    }

    setHakedis(h);
    setProject(bundle.project || null);
    setItems(Array.isArray(bundle.items) ? bundle.items : []);
    setDeductions(Array.isArray(bundle.deductions) ? bundle.deductions : []);
    setStatus("valid");
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async () => {
    if (!hakedis || !token) return;
    setSubmitting(true);
    try {
      await supabase.rpc("update_hakedis_approval", {
        _token: token,
        _approval_status: "onaylandi",
      });

      // Notify engineer via email
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "hakedis-approval-result",
          recipientEmail: "",
          idempotencyKey: `hakedis-approve-${hakedis.id}-${Date.now()}`,
          templateData: {
            projectName: project?.name || "Proje",
            period: hakedis.period,
            netAmount: fmt(hakedis.net_total || hakedis.net),
            result: "onaylandi",
            clientNote: "",
            approvalDate: new Date().toLocaleDateString("tr-TR"),
          },
        },
      });

      setDone("approved");
      toast.success("Hakediş onaylandı!");
    } catch (err) {
      console.error(err);
      toast.error("İşlem sırasında hata oluştu.");
    }
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!hakedis || !rejectNote.trim()) {
      toast.error("Lütfen itiraz notunuzu yazın.");
      return;
    }
    setSubmitting(true);
    try {
      await supabase.rpc("update_hakedis_approval", {
        _token: token!,
        _approval_status: "itiraz_edildi",
        _client_note: rejectNote.trim(),
      });

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "hakedis-approval-result",
          recipientEmail: "",
          idempotencyKey: `hakedis-reject-${hakedis.id}-${Date.now()}`,
          templateData: {
            projectName: project?.name || "Proje",
            period: hakedis.period,
            netAmount: fmt(hakedis.net_total || hakedis.net),
            result: "itiraz_edildi",
            clientNote: rejectNote.trim(),
            approvalDate: new Date().toLocaleDateString("tr-TR"),
          },
        },
      });

      setDone("rejected");
      toast.success("İtirazınız iletildi.");
    } catch (err) {
      console.error(err);
      toast.error("İşlem sırasında hata oluştu.");
    }
    setSubmitting(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0F1419" }}>
        <div className="w-6 h-6 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0F1419" }}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "#EF4444" }} />
          <h1 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>Bu link geçersiz</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Lütfen hakediş gönderen firma ile iletişime geçin.</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0F1419" }}>
        <div className="text-center max-w-md">
          <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: "#F59E0B" }} />
          <h1 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>Bu linkin süresi dolmuş</h1>
          <p className="text-sm" style={{ color: "#64748B" }}>Lütfen hakediş gönderen firma ile iletişime geçin.</p>
        </div>
      </div>
    );
  }

  if (status === "already_done" || done) {
    const isApproved = done === "approved";
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0F1419" }}>
        <div className="rounded-xl p-8 text-center max-w-md" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          {isApproved ? (
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#22C55E" }} />
          ) : (
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#EF4444" }} />
          )}
          <h2 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>
            {isApproved ? "Hakediş Onaylandı!" : "İtiraz İletildi!"}
          </h2>
          <p className="text-sm" style={{ color: "#64748B" }}>
            {isApproved
              ? "Teşekkür ederiz. Onayınız kaydedildi ve gönderen taraf bilgilendirildi."
              : "İtirazınız kaydedildi. Gönderen taraf bilgilendirildi ve sizinle iletişime geçecektir."}
          </p>
        </div>
      </div>
    );
  }

  const grossTotal = hakedis.gross_total || hakedis.amount || 0;
  const deductionsTotal = hakedis.deductions_total || 0;
  const netTotal = hakedis.net_total || hakedis.net || 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: "#0F1419" }}>
      <div className="w-full max-w-2xl space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FF6B2B" }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Şantiyem Hakediş Sistemi</span>
          </div>
          <h1 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>Hakediş Onay Talebi</h1>
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>
            {project?.name || "Proje"} — {hakedis.period}
          </p>
        </div>

        {/* Project info */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span style={{ color: "#64748B" }}>Proje:</span>
              <p className="font-medium" style={{ color: "#F1F5F9" }}>{project?.name || "—"}</p>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>İşveren:</span>
              <p className="font-medium" style={{ color: "#F1F5F9" }}>{project?.client || "—"}</p>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Dönem:</span>
              <p className="font-medium" style={{ color: "#F1F5F9" }}>{hakedis.period}</p>
            </div>
            <div>
              <span style={{ color: "#64748B" }}>Revizyon:</span>
              <p className="font-medium" style={{ color: "#F1F5F9" }}>R{hakedis.revision_count || 0}</p>
            </div>
          </div>
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="rounded-xl p-4 overflow-x-auto" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#94A3B8" }}>İş Kalemleri</h3>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  <th className="text-left py-2 pr-2" style={{ color: "#64748B" }}>Poz No</th>
                  <th className="text-left py-2 pr-2" style={{ color: "#64748B" }}>Tarif</th>
                  <th className="text-center py-2 px-1" style={{ color: "#64748B" }}>Birim</th>
                  <th className="text-right py-2 px-1" style={{ color: "#64748B" }}>Miktar</th>
                  <th className="text-right py-2 px-1" style={{ color: "#64748B" }}>B.Fiyat</th>
                  <th className="text-right py-2" style={{ color: "#64748B" }}>Tutar</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #1E2732" }}>
                    <td className="py-2 pr-2 font-mono" style={{ color: "#94A3B8" }}>{item.poz_no}</td>
                    <td className="py-2 pr-2" style={{ color: "#F1F5F9" }}>{item.description}</td>
                    <td className="text-center py-2 px-1" style={{ color: "#94A3B8" }}>{item.unit}</td>
                    <td className="text-right py-2 px-1" style={{ color: "#F1F5F9" }}>{item.current_qty || item.quantity}</td>
                    <td className="text-right py-2 px-1" style={{ color: "#94A3B8" }}>{fmt(item.unit_price)}</td>
                    <td className="text-right py-2 font-semibold" style={{ color: "#F1F5F9" }}>{fmt(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: "#94A3B8" }}>Özet</h3>
          <div className="flex justify-between text-xs">
            <span style={{ color: "#64748B" }}>Brüt Tutar:</span>
            <span style={{ color: "#F1F5F9" }}>{fmt(grossTotal)}</span>
          </div>
          {deductions.map(d => (
            <div key={d.id} className="flex justify-between text-xs">
              <span style={{ color: "#64748B" }}>{d.label} ({d.rate}%):</span>
              <span style={{ color: "#EF4444" }}>-{fmt(d.amount)}</span>
            </div>
          ))}
          {deductionsTotal > 0 && (
            <div className="flex justify-between text-xs pt-1" style={{ borderTop: "1px solid #1E2732" }}>
              <span style={{ color: "#64748B" }}>Kesintiler Toplamı:</span>
              <span style={{ color: "#EF4444" }}>-{fmt(deductionsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: "1px solid #1E2732" }}>
            <span style={{ color: "#F1F5F9" }}>Net Ödenecek Tutar:</span>
            <span style={{ color: "#22C55E" }}>{fmt(netTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          {!showRejectForm ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleApprove}
                disabled={submitting}
                className="h-12 text-sm font-semibold text-white"
                style={{ backgroundColor: "#22C55E" }}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                {submitting ? "İşleniyor..." : "✅ Onayla"}
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={submitting}
                variant="outline"
                className="h-12 text-sm font-semibold"
                style={{ borderColor: "#EF4444", color: "#EF4444" }}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                ❌ İtiraz Et
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium" style={{ color: "#F1F5F9" }}>İtiraz Notunuz:</p>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="İtiraz nedeninizi açıklayın..."
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none"
                style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleReject}
                  disabled={submitting || !rejectNote.trim()}
                  className="h-10 text-sm font-semibold text-white"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  {submitting ? "Gönderiliyor..." : "İtirazı Gönder"}
                </Button>
                <Button
                  onClick={() => setShowRejectForm(false)}
                  variant="outline"
                  className="h-10 text-sm"
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Legal notice */}
        <p className="text-[10px] text-center" style={{ color: "#475569" }}>
          ℹ️ Bu sistem hakediş takibi amaçlıdır. Onayınız dijital kayıt altına alınmaktadır.
        </p>
      </div>
    </div>
  );
}
