import { useState } from "react";
import { Mail, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Contract } from "@/hooks/useContracts";
import { cardStyle, inputStyle, labelStyle } from "./ContractTypes";

interface Props {
  contract: Contract;
  senderName: string;
  onSend: (data: {
    recipientName: string;
    recipientEmail: string;
    ccEmails: string[];
    message: string;
    deadline: string | null;
  }) => Promise<any>;
  onClose: () => void;
}

export default function SendForSignatureModal({ contract, senderName, onSend, onClose }: Props) {
  const [recipientName, setRecipientName] = useState(contract.counterparty || "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [message, setMessage] = useState(
    `Sayın ${contract.counterparty || "[Alıcı Adı]"},\n\n${contract.name} sözleşmesini incelemeniz ve imzalamanız için iletiyoruz.\n\nLütfen sözleşmeyi indirip ıslak imzalı halini bize iletiniz.\nSözleşmeyi bu platforma yüklemek için aşağıdaki butonu kullanabilirsiniz.\n\nSaygılarımızla,\n${senderName}`
  );
  const [deadline, setDeadline] = useState("");
  const [sending, setSending] = useState(false);

  const addCc = () => {
    if (ccInput && ccInput.includes("@") && !ccEmails.includes(ccInput)) {
      setCcEmails(p => [...p, ccInput]);
      setCcInput("");
    }
  };

  const handleSend = async () => {
    if (!recipientName.trim() || !recipientEmail.trim()) return;
    setSending(true);
    await onSend({
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim(),
      ccEmails,
      message,
      deadline: deadline || null,
    });
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Mail className="w-4 h-4" style={{ color: "#3B82F6" }} /> Sözleşmeyi İmzaya Gönder
          </h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          {/* Recipient Name */}
          <div>
            <label className="text-[10px] block mb-1" style={labelStyle}>Alıcı Adı *</label>
            <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
              className="w-full rounded px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="Ahmet Kaya" />
          </div>

          {/* Recipient Email */}
          <div>
            <label className="text-[10px] block mb-1" style={labelStyle}>Alıcı E-posta *</label>
            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} type="email"
              className="w-full rounded px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="ahmet@abcyapi.com" />
          </div>

          {/* CC */}
          <div>
            <label className="text-[10px] block mb-1" style={labelStyle}>CC E-posta (opsiyonel)</label>
            <div className="flex gap-2">
              <input value={ccInput} onChange={e => setCcInput(e.target.value)} type="email"
                className="flex-1 rounded px-3 py-2 text-sm outline-none" style={inputStyle}
                placeholder="cc@firma.com" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCc())} />
              <Button onClick={addCc} variant="outline" size="sm" className="h-9" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {ccEmails.map((cc, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#60A5FA" }}>
                    {cc}
                    <button onClick={() => setCcEmails(p => p.filter((_, j) => j !== i))}>
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="text-[10px] block mb-1" style={labelStyle}>Mesaj</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
              className="w-full rounded px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-[10px] block mb-1" style={labelStyle}>İmza için Son Tarih (opsiyonel)</label>
            <input value={deadline} onChange={e => setDeadline(e.target.value)} type="date"
              className="w-full rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>

          {/* PDF Preview */}
          {contract.file_url && (
            <div className="rounded-lg p-3 bg-background border border-border">
              <p className="text-[10px] font-medium mb-1 text-muted-foreground">📎 Ekli Dosya</p>
              <p className="text-xs truncate text-foreground">{contract.file_name || "Sözleşme PDF"}</p>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p className="text-[10px]" style={{ color: "#60A5FA" }}>
              ℹ️ Bu sistem sözleşme takibi amaçlıdır. Hukuki geçerlilik için ıslak imzalı orijinal belgeyi muhafaza ediniz.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSend} disabled={sending || !recipientName.trim() || !recipientEmail.trim()}
            className="flex-1 h-9 text-sm font-semibold text-white" style={{ backgroundColor: "#3B82F6" }}>
            {sending ? "Gönderiliyor..." : "📧 Gönder"}
          </Button>
          <Button onClick={onClose} variant="outline" className="h-9 text-sm" style={{ borderColor: "#1E2732", color: "#94A3B8" }}>
            İptal
          </Button>
        </div>
      </div>
    </div>
  );
}
