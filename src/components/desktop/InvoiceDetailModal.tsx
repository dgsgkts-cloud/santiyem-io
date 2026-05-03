import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Send, Link2, Wallet, Trash2, FileText, Calendar, Building2, Hash } from "lucide-react";
import { EInvoice, computeEffectiveStatus } from "@/hooks/useEInvoices";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import { useProjects } from "@/hooks/useProjects";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  beklemede: { label: "Bekliyor", color: "#F59E0B" },
  onaylandi: { label: "Onaylandı", color: "#22C55E" },
  reddedildi: { label: "Reddedildi", color: "#EF4444" },
  iade: { label: "İade", color: "#A855F7" },
  iptal: { label: "İptal", color: "#64748B" },
  odendi: { label: "Ödendi", color: "#22C55E" },
  tahsil_edildi: { label: "Tahsil Edildi", color: "#22C55E" },
  gecikmis: { label: "Gecikmiş", color: "#EF4444" },
};

interface Props {
  invoice: EInvoice | null;
  onClose: () => void;
  onLinkToCash: (inv: EInvoice) => void;
  onDelete: (inv: EInvoice) => void;
}

const InvoiceDetailModal = ({ invoice, onClose, onLinkToCash, onDelete }: Props) => {
  const { projects } = useProjects();
  if (!invoice) return null;

  const eff = computeEffectiveStatus(invoice);
  const statusMeta = STATUS_LABELS[eff] || STATUS_LABELS.beklemede;
  const isGelen = invoice.direction === "gelen";
  const project = projects.find((p) => p.id === invoice.project_id);
  const linked = !!(invoice.linked_payment_id || invoice.linked_collection_id);

  const items = Array.isArray(invoice.items) ? invoice.items : [];

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Fatura Detayı
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header strip */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {isGelen ? <><Inbox className="w-3 h-3 mr-1" /> Gelen</> : <><Send className="w-3 h-3 mr-1" /> Giden</>}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {invoice.invoice_type === "e_fatura" ? "E-Fatura" : "E-Arşiv"}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs"
              style={{ color: statusMeta.color, borderColor: statusMeta.color }}
            >
              {statusMeta.label}
            </Badge>
            {linked && (
              <Badge variant="outline" className="text-xs text-success border-success/40">
                <Wallet className="w-3 h-3 mr-1" /> Kasaya Bağlı
              </Badge>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <InfoRow icon={Hash} label="Fatura No" value={invoice.invoice_no || "—"} mono />
            <InfoRow icon={Calendar} label="Fatura Tarihi" value={invoice.invoice_date} />
            {invoice.due_date && (
              <InfoRow
                icon={Calendar}
                label="Vade Tarihi"
                value={invoice.due_date}
                accent={eff === "gecikmis" ? "#EF4444" : undefined}
              />
            )}
            {invoice.invoice_uuid && (
              <InfoRow icon={Hash} label="ETTN" value={invoice.invoice_uuid} mono small />
            )}
            <InfoRow
              icon={Building2}
              label={isGelen ? "Tedarikçi" : "Müşteri"}
              value={invoice.counterparty_name}
            />
            {invoice.counterparty_tax_no && (
              <InfoRow icon={Hash} label="VKN/TCKN" value={invoice.counterparty_tax_no} mono />
            )}
            {project && (
              <InfoRow icon={FileText} label="Proje" value={project.name} />
            )}
          </div>

          {invoice.description && (
            <div className="text-sm bg-muted/30 rounded-lg p-3">
              <div className="text-[11px] uppercase text-muted-foreground mb-1">Açıklama</div>
              <div>{invoice.description}</div>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="text-sm font-semibold mb-2">Fatura Kalemleri</div>
            {items.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 text-center">
                Bu fatura için kalem detayı kaydedilmemiş.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Açıklama</th>
                      <th className="px-3 py-2 text-right w-20">Miktar</th>
                      <th className="px-3 py-2 text-right w-28">Birim Fiyat</th>
                      <th className="px-3 py-2 text-right w-16">KDV</th>
                      <th className="px-3 py-2 text-right w-28">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const line = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                      const total = line * (1 + (Number(it.kdv_rate) || 0) / 100);
                      return (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-3 py-2">{it.description || "—"}</td>
                          <td className="px-3 py-2 text-right">{Number(it.quantity)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrencyFull(Number(it.unit_price))}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">%{Number(it.kdv_rate)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrencyFull(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Matrah</span>
              <span className="font-medium">{formatCurrencyFull(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KDV Toplam</span>
              <span className="font-medium">{formatCurrencyFull(Number(invoice.kdv_total))}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border text-base">
              <span className="font-semibold">Genel Toplam</span>
              <span className="font-bold text-primary">{formatCurrencyFull(Number(invoice.grand_total))}</span>
            </div>
          </div>

          {/* Linked cash info */}
          {linked && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-success" />
              <span>
                Bu fatura Kasa & Ödemeler modülüne{" "}
                <strong>{invoice.linked_payment_id ? "gider" : "tahsilat"}</strong> olarak işlendi.
              </span>
            </div>
          )}

          {invoice.file_name && (
            <div className="text-xs text-muted-foreground">
              📎 Kaynak dosya: <span className="font-mono">{invoice.file_name}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-border">
            <Button variant="ghost" onClick={onClose}>Kapat</Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(invoice)}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Sil
            </Button>
            {!linked && (
              <Button onClick={() => onLinkToCash(invoice)}>
                <Link2 className="w-4 h-4 mr-1" />
                {isGelen ? "Gider olarak işle" : "Tahsilat olarak işle"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({
  icon: Icon, label, value, mono, small, accent,
}: {
  icon: any; label: string; value: string; mono?: boolean; small?: boolean; accent?: string;
}) => (
  <div className="flex items-start gap-2">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`${mono ? "font-mono" : ""} ${small ? "text-xs break-all" : ""}`}
        style={accent ? { color: accent, fontWeight: 600 } : undefined}
      >
        {value}
      </div>
    </div>
  </div>
);

export default InvoiceDetailModal;
