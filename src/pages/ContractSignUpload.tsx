import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, CheckCircle2, AlertTriangle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContractSignUpload() {
  const { token } = useParams<{ token: string }>();
  const [request, setRequest] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "expired" | "invalid">("loading");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [existingUploads, setExistingUploads] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!token) { setStatus("invalid"); return; }

    const { data: rows, error } = await (supabase as any)
      .rpc("get_signature_request_by_token", { _token: token });

    const req = Array.isArray(rows) ? rows[0] : rows;
    if (error || !req) { setStatus("invalid"); return; }

    const expiryDate = req.deadline
      ? new Date(req.deadline)
      : new Date(new Date(req.sent_at).getTime() + 30 * 24 * 60 * 60 * 1000);

    if (new Date() > expiryDate) { setRequest(req); setStatus("expired"); return; }

    setRequest(req);
    setContract({
      name: req.contract_name,
      counterparty: req.contract_counterparty,
      file_url: req.contract_file_url,
      file_name: req.contract_file_name,
    });

    const { data: uploads } = await (supabase as any)
      .rpc("list_signed_uploads_by_token", { _token: token });
    setExistingUploads(Array.isArray(uploads) ? uploads : []);

    setStatus("valid");
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async () => {
    if (!file || !signerName.trim() || !request) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "pdf";
      // Path begins with the signing token so storage RLS can verify the uploader
      // possesses a valid, non-expired token (not just a known request id).
      const path = `${token}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("signed-contracts")
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("signed-contracts").getPublicUrl(path);

      const { error: rpcErr } = await (supabase as any).rpc("record_signed_upload", {
        _token: token,
        _signer_name: signerName.trim(),
        _signer_title: signerTitle.trim() || null,
        _file_url: urlData.publicUrl,
        _file_name: file.name,
        _file_size: file.size,
      });
      if (rpcErr) throw rpcErr;

      // Notify owner via email
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "signature-uploaded",
          recipientEmail: "", // will use template's `to` or we pass owner email from metadata
          idempotencyKey: `sig-upload-${request.id}-${Date.now()}`,
          templateData: {
            contractName: contract?.name || "Sözleşme",
            signerName: signerName.trim(),
            signerTitle: signerTitle.trim(),
            uploadDate: new Date().toLocaleDateString("tr-TR"),
            downloadUrl: urlData.publicUrl,
          },
        },
      });

      setUploaded(true);
      toast.success("İmzalı sözleşme başarıyla yüklendi!");
    } catch (err) {
      console.error(err);
      toast.error("Yükleme sırasında hata oluştu.");
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type === "application/pdf" || f.type.startsWith("image/"))) setFile(f);
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
          <p className="text-sm" style={{ color: "#64748B" }}>Lütfen gönderen firma ile iletişime geçin.</p>
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
          <p className="text-sm" style={{ color: "#64748B" }}>Lütfen gönderen firma ile iletişime geçin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#0F1419" }}>
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FF6B2B" }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Şantiyem Sözleşme Sistemi</span>
          </div>
          <h1 className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{contract?.name || "Sözleşme"}</h1>
          <p className="text-xs mt-1" style={{ color: "#64748B" }}>Gönderen: {contract?.counterparty || "—"}</p>
        </div>

        {uploaded ? (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: "#22C55E" }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: "#F1F5F9" }}>İmzalı Sözleşme Yüklendi!</h2>
            <p className="text-sm" style={{ color: "#64748B" }}>Teşekkür ederiz. Gönderen taraf bilgilendirildi.</p>
          </div>
        ) : (
          <>
            {/* Download button */}
            {contract?.file_url && (
              <a href={contract.file_url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-[#3B82F6] transition-colors"
                  style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
                  <Download className="w-6 h-6" style={{ color: "#3B82F6" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>📄 Sözleşmeyi İndir</p>
                    <p className="text-[10px]" style={{ color: "#64748B" }}>{contract.file_name || "Sözleşme PDF"}</p>
                  </div>
                </div>
              </a>
            )}

            {/* Info box */}
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-xs" style={{ color: "#60A5FA" }}>
                Sözleşmeyi indirin, ıslak imzalayın veya kaşeleyip tarayın, ardından aşağıya yükleyin.
              </p>
            </div>

            {/* Deadline */}
            {request?.deadline && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#F59E0B" }}>
                <Clock className="w-3.5 h-3.5" />
                <span>⏰ Son tarih: {new Date(request.deadline).toLocaleDateString("tr-TR")}</span>
              </div>
            )}

            {/* Upload area */}
            <div className="rounded-xl p-6" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById("file-input")?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-[#3B82F6]"
                style={{ borderColor: file ? "#22C55E" : "#1E2732" }}
              >
                <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: file ? "#22C55E" : "#64748B" }} />
                {file ? (
                  <p className="text-sm font-medium" style={{ color: "#22C55E" }}>{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: "#94A3B8" }}>Dosyayı sürükleyin veya tıklayın</p>
                    <p className="text-[10px] mt-1" style={{ color: "#64748B" }}>PDF, JPG, PNG — max 20MB</p>
                  </>
                )}
              </div>

              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Ad Soyad *</label>
                  <input value={signerName} onChange={e => setSignerName(e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                    placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "#64748B" }}>Unvan (opsiyonel)</label>
                  <input value={signerTitle} onChange={e => setSignerTitle(e.target.value)}
                    className="w-full rounded px-3 py-2 text-sm outline-none"
                    style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
                    placeholder="Genel Müdür" />
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={uploading || !file || !signerName.trim()}
                className="w-full h-10 mt-4 text-sm font-semibold text-white"
                style={{ backgroundColor: "#22C55E" }}
              >
                {uploading ? "Yükleniyor..." : "✅ Yükle ve Onayla"}
              </Button>
            </div>

            {/* Existing uploads */}
            {existingUploads.length > 0 && (
              <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
                <p className="text-xs font-semibold" style={{ color: "#64748B" }}>Önceki Yüklemeler</p>
                {existingUploads.map(u => (
                  <div key={u.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: "#F1F5F9" }}>{u.file_name} — {u.signer_name}</span>
                    <a href={u.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px]" style={{ color: "#3B82F6" }}>İndir</a>
                  </div>
                ))}
              </div>
            )}

            {/* Legal notice */}
            <p className="text-[10px] text-center" style={{ color: "#475569" }}>
              ℹ️ Bu sistem sözleşme takibi amaçlıdır. Hukuki geçerlilik için ıslak imzalı orijinal belgeyi muhafaza ediniz.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
