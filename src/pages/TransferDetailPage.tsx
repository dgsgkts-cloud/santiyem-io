// DEPO — kanonik transfer detay sayfası: /depo/transferler/:transferId
//
// Bildirim bağlantıları, transfer numaraları ve "Detayı Aç" işlemleri buraya
// gelir. Sayfa yenilenmesinde, doğrudan URL ile açılışta ve geri tuşunda aynı
// içerik görünür; hiçbir bilgi geçici panel durumunda saklanmaz.

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowLeftRight, Clock, FileText, Loader2, PackageCheck, Truck,
  AlertTriangle, Link2, ShieldAlert,
} from "lucide-react";
import { PageShell, SectionCard } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useInventoryTransfers, type TransferRow } from "@/hooks/useInventoryTransfers";
import { useDepotPermissions } from "@/hooks/useDepotPermissions";
import { useWarehouseData } from "@/components/desktop/warehouse/useWarehouseData";
import { TransferActionDialog } from "@/components/desktop/warehouse/TransferDialogs";
import { TransferDocumentsCard } from "@/components/desktop/warehouse/TransferDocumentsCard";
import { fmtQty, fmtDateTime } from "@/components/desktop/warehouse/inventoryTruth";
import {
  TRANSFER_STATUS_LABEL, TRANSFER_STATUS_TONE, TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_EXPLANATION, availableTransferActions, discrepancyTotal,
  quantityChain, transferProgress, overdueInfo,
  type TransferAction, type TransferActor, type TransferStatus,
} from "@/lib/inventory/transferModel";

const ts = (v: string) => fmtDateTime(new Date(v));

const EVENT_LABEL_TR: Record<string, string> = {
  created: "Talep oluşturuldu",
  approve: "Onaylandı",
  reject: "Reddedildi",
  request_revision: "Revizyon istendi",
  revise: "Revizyon istendi",
  dispatch: "Sevk edildi",
  receive: "Teslim alındı",
  cancel: "İptal edildi",
  return: "Transit sevkiyat kaynağa geri alındı",
  document_uploaded: "Belge yüklendi",
  document_deleted: "Belge silindi",
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
    <span className="ds-caption text-muted-foreground shrink-0">{label}</span>
    <span className="ds-body text-foreground text-right break-words min-w-0">{value}</span>
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <p className="ds-caption text-muted-foreground">{text}</p>
);

const CHAIN_TONE: Record<string, string> = {
  default: "text-foreground",
  transit: "text-indigo-300/90",
  success: "text-emerald-300/90",
  danger: "text-rose-300/90",
};

export default function TransferDetailPage() {
  const { transferId } = useParams<{ transferId: string }>();
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { eventsFor } = useInventoryTransfers();
  const { transfer, isLoading } = useTransfer(transferId);
  const { permissions, isLoading: permsLoading } = useDepotPermissions();
  const data = useWarehouseData();
  const [action, setAction] = useState<TransferAction | null>(null);

  const backTo = useMemo(() => {
    const geri = sp.get("geri");
    if (geri && geri.startsWith("/depo")) return geri;
    return "/depo?sekme=transferler";
  }, [sp]);


  useEffect(() => {
    if (transfer) document.title = `${transfer.transfer_no} · Transfer Detayı | Şantiyem`;
    return () => { document.title = "Şantiyem"; };
  }, [transfer?.transfer_no]);

  if (!userLoading && !user) return <Navigate to="/login" replace />;

  const loading = userLoading || isLoading || permsLoading || data.loading;

  if (loading) {
    return (
      <PageShell title="Transfer Detayı" subtitle="Kayıt yükleniyor">
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="ds-body">Transfer kaydı yükleniyor…</span>
        </div>
      </PageShell>
    );
  }

  if (!transfer) {
    return (
      <PageShell title="Transfer bulunamadı">
        <SectionCard>
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 min-w-0">
              <p className="ds-body text-foreground">
                Bu transfer kaydı bulunamadı veya görüntüleme yetkiniz yok.
              </p>
              <p className="ds-caption text-muted-foreground">
                Kayıt iptal edilmiş, silinmiş ya da başka bir firmaya ait olabilir. Depo
                yöneticinizle görüşebilirsiniz.
              </p>
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link to={backTo}><ArrowLeft className="w-4 h-4 mr-1.5" /> Transfer listesine dön</Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const materialName = data.items.find((i) => i.id === transfer.material_id)?.name ?? "Malzeme kaydı yok";
  const whName = (id: string) => data.warehouses.find((w) => w.id === id)?.name ?? "—";
  const sourceName = whName(transfer.source_warehouse_id);
  const destName = whName(transfer.dest_warehouse_id);

  const actor: TransferActor = {
    userId: user?.id ?? null,
    isOwner: permissions.approve_transfer && permissions.override_safety_stock,
    permissions,
  };
  const actions = availableTransferActions(transfer, actor);
  const progress = transferProgress(transfer);
  const disc = discrepancyTotal(transfer);
  const chain = quantityChain(transfer);
  const overdue = overdueInfo(transfer);

  const history = eventsFor(transfer.id);
  const dispatches = history.filter((e) => e.action === "dispatch");
  const receipts = history.filter((e) => e.action === "receive");
  const returns = history.filter((e) => e.action === "return");
  const movements = data.ledger.filter(
    (m) => m.source_type === "inventory_transfer" && m.source_document === transfer.transfer_no,
  );
  const documents = [
    ...(transfer.dispatch_reference
      ? [{ label: "Sevk irsaliye no", value: transfer.dispatch_reference }] : []),
    ...history
      .filter((e) => typeof e.payload?.reference === "string" && e.payload.reference)
      .map((e) => ({
        label: e.action === "receive" ? "Teslim belge no" : "Belge no",
        value: String(e.payload?.reference),
      })),
  ];

  const project = transfer.project_id
    ? data.items.find((i) => i.id === transfer.material_id)?.name && transfer.project_id
    : null;

  const eventQty = (p: Record<string, unknown> | null) =>
    typeof p?.quantity === "number" ? `${fmtQty(Number(p.quantity))} ${transfer.unit}` : "—";

  return (
    <>
      <PageShell
        maxWidth={1400}
        title={
          <span className="flex items-center gap-2 min-w-0">
            <ArrowLeftRight className="w-5 h-5 text-[#FF6B2B] shrink-0" />
            <span className="truncate">{transfer.transfer_no}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words">{materialName}</span>
            <span aria-hidden>·</span>
            <span className="break-words">{sourceName} → {destName}</span>
          </span>
        }
        actions={
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to={backTo}><ArrowLeft className="w-4 h-4 mr-1.5" /> Listeye dön</Link>
          </Button>
        }
      >
        <div className="space-y-4">
          {/* durum + akış + eylemler */}
          <SectionCard>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
                  TRANSFER_STATUS_TONE[transfer.status as TransferStatus])}>
                  {TRANSFER_STATUS_LABEL[transfer.status as TransferStatus] ?? transfer.status}
                </span>
                <span className="ds-caption text-muted-foreground">{progress.label}</span>
                {overdue.overdue && (
                  <span className="text-fs-xs px-2 py-0.5 rounded-full border border-rose-500/25 bg-rose-500/[0.08] text-rose-300/90">
                    {overdue.days} gün gecikme
                  </span>
                )}
              </div>
              <div className="h-[6px] w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    progress.failed ? "bg-rose-400/80" : "bg-emerald-400/80")}
                  style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                />
              </div>

              {actions.length === 0 ? (
                <Empty text="Bu durumda ve mevcut yetkinizle yapılabilecek bir işlem yok." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <Button
                      key={a}
                      variant={a === "approve" || a === "dispatch" || a === "receive" ? "default" : "outline"}
                      className="min-h-[44px]"
                      onClick={() => setAction(a)}
                      title={TRANSFER_ACTION_EXPLANATION[a]}
                    >
                      {TRANSFER_ACTION_LABEL[a]}
                    </Button>
                  ))}
                  {transfer.status === "discrepancy" && (
                    <Button variant="outline" className="min-h-[44px]" asChild>
                      <a href="#uyusmazliklar">Uyuşmazlığı İncele</a>
                    </Button>
                  )}
                  {transfer.status === "received" && (
                    <Button variant="outline" className="min-h-[44px]" asChild>
                      <a href="#stok-hareketleri">Stok Hareketlerini Gör</a>
                    </Button>
                  )}
                </div>
              )}
              {actions.length === 0 && transfer.status === "discrepancy" && (
                <Button variant="outline" className="min-h-[44px]" asChild>
                  <a href="#uyusmazliklar">Uyuşmazlığı İncele</a>
                </Button>
              )}
              {actions.length === 0 && transfer.status === "received" && (
                <Button variant="outline" className="min-h-[44px]" asChild>
                  <a href="#stok-hareketleri">Stok Hareketlerini Gör</a>
                </Button>
              )}
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Genel Bilgiler */}
            <SectionCard title="Genel Bilgiler">
              <Row label="Transfer no" value={transfer.transfer_no} />
              <Row label="Malzeme" value={`${materialName} · ${transfer.unit}`} />
              <Row label="Kaynak depo" value={sourceName} />
              <Row label="Hedef depo" value={destName} />
              <Row label="Talep tarihi" value={ts(transfer.requested_at ?? transfer.created_at)} />
              <Row label="İhtiyaç tarihi" value={transfer.required_date ?? "Belirtilmedi"} />
              <Row label="Onay" value={transfer.approved_at ? ts(transfer.approved_at) : "—"} />
              <Row label="Sevk" value={transfer.dispatched_at ? ts(transfer.dispatched_at) : "—"} />
              <Row label="Tahmini varış" value={transfer.expected_arrival_at ? ts(transfer.expected_arrival_at) : "—"} />
              <Row label="Teslim" value={transfer.received_at ? ts(transfer.received_at) : "—"} />
              <Row label="Sebep" value={transfer.reason ?? "—"} />
              {transfer.notes && <Row label="Açıklama" value={transfer.notes} />}
              {transfer.rejection_reason && <Row label="Red sebebi" value={transfer.rejection_reason} />}
              {transfer.revision_note && <Row label="Revizyon notu" value={transfer.revision_note} />}
              {transfer.cancel_reason && <Row label="İptal sebebi" value={transfer.cancel_reason} />}
              <Row
                label="Birim maliyet"
                value={transfer.unit_cost === null ? "Bilinmiyor" : `${fmtQty(transfer.unit_cost)} / ${transfer.unit}`}
              />
            </SectionCard>

            {/* Miktar Özeti */}
            <SectionCard title="Miktar Özeti" subtitle="Tüm zincir açıkça listelenir">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {chain.map((c) => (
                  <div key={c.key} className="rounded-card border border-border/60 bg-background/40 p-2.5 min-w-0">
                    <p className="ds-caption text-muted-foreground truncate">{c.label}</p>
                    <p className={cn("ds-body font-medium truncate", CHAIN_TONE[c.tone ?? "default"])}>
                      {fmtQty(c.value)} <span className="text-muted-foreground">{transfer.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Sevkiyatlar */}
            <SectionCard title="Sevkiyatlar" subtitle={`${dispatches.length} kayıt`}>
              {dispatches.length === 0 ? (
                <Empty text="Henüz sevk kaydı yok." />
              ) : (
                <ul className="space-y-2">
                  {dispatches.map((e) => (
                    <li key={e.id} className="rounded-card border border-border/60 bg-background/40 p-2.5">
                      <p className="ds-body text-foreground flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-300/90 shrink-0" />
                        {eventQty(e.payload)}
                      </p>
                      <p className="ds-caption text-muted-foreground">{ts(e.created_at)}</p>
                      {e.note && <p className="ds-caption text-muted-foreground mt-0.5">{e.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Teslim Almalar */}
            <SectionCard title="Teslim Almalar" subtitle={`${receipts.length} kayıt`}>
              {receipts.length === 0 ? (
                <Empty text="Henüz teslim kaydı yok." />
              ) : (
                <ul className="space-y-2">
                  {receipts.map((e) => (
                    <li key={e.id} className="rounded-card border border-border/60 bg-background/40 p-2.5">
                      <p className="ds-body text-foreground flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-emerald-300/90 shrink-0" />
                        Kabul {typeof e.payload?.accepted === "number"
                          ? `${fmtQty(Number(e.payload.accepted))} ${transfer.unit}`
                          : eventQty(e.payload)}
                      </p>
                      <p className="ds-caption text-muted-foreground">{ts(e.created_at)}</p>
                      {e.note && <p className="ds-caption text-muted-foreground mt-0.5">{e.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Uyuşmazlıklar */}
          <div id="uyusmazliklar" className="scroll-mt-20">
            <SectionCard title="Uyuşmazlıklar" subtitle="Hasarlı, eksik ve reddedilen miktarlar">
              {disc <= 0 ? (
                <Empty text="Bu transfer için uyuşmazlık kaydı bulunmuyor." />
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Row label="Hasarlı" value={`${fmtQty(transfer.damaged_quantity)} ${transfer.unit}`} />
                    <Row label="Eksik" value={`${fmtQty(transfer.missing_quantity)} ${transfer.unit}`} />
                    <Row label="Reddedilen" value={`${fmtQty(transfer.rejected_quantity)} ${transfer.unit}`} />
                  </div>
                  {transfer.discrepancy_note && (
                    <div className="flex items-start gap-2 p-2.5 rounded-card border border-rose-500/25 bg-rose-500/[0.06]">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="ds-caption text-rose-200/90 whitespace-pre-line">{transfer.discrepancy_note}</p>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Stok Hareketleri */}
          <div id="stok-hareketleri" className="scroll-mt-20">
            <SectionCard title="Stok Hareketleri" subtitle="Değiştirilemez hareket defteri kayıtları">
              {movements.length === 0 ? (
                <Empty text="Bu transfer için stok hareketi oluşmadı." />
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <ul className="space-y-2 min-w-0">
                    {movements.map((m) => (
                      <li key={m.id} className="rounded-card border border-border/60 bg-background/40 p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="ds-body text-foreground min-w-0 break-words">
                            {m.direction > 0 ? "Giriş" : "Çıkış"} · {fmtQty(Number(m.quantity))} {m.unit}
                            <span className="text-muted-foreground"> · {whName(m.warehouse_id ?? "")}</span>
                          </p>
                          <p className="ds-caption text-muted-foreground">{m.transaction_date}</p>
                        </div>
                        {m.reason && <p className="ds-caption text-muted-foreground mt-0.5">{m.reason}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Belgeler */}
            <TransferDocumentsCard
              transferId={transfer.id}
              ownerId={transfer.user_id}
              references={documents}
              canManage={
                permissions.create_transfer || permissions.dispatch_transfer ||
                permissions.receive_transfer || permissions.approve_transfer
              }
            />

            {/* Bağlantılı Kayıtlar */}
            <SectionCard title="Bağlantılı Kayıtlar">
              <Row label="Malzeme kartı" value={materialName} />
              <Row label="Kaynak depo" value={sourceName} />
              <Row label="Hedef depo" value={destName} />
              <Row label="Proje" value={transfer.project_id ?? "Bağlı proje yok"} />
              <Row label="Stok hareketi" value={`${movements.length} kayıt`} />
              <Row label="İade kaydı" value={returns.length > 0 ? `${returns.length} kayıt` : "Yok"} />
              <div className="pt-2">
                <Button variant="outline" className="min-h-[44px]" asChild>
                  <Link to="/depo?sekme=movements">
                    <Link2 className="w-4 h-4 mr-1.5" /> Depo hareket defterini aç
                  </Link>
                </Button>
              </div>
            </SectionCard>
          </div>

          {/* Onay ve Hareket Geçmişi */}
          <SectionCard title="Onay ve Hareket Geçmişi" subtitle={`${history.length} olay`}>
            {history.length === 0 ? (
              <Empty text="Bu transfer için olay kaydı bulunmuyor." />
            ) : (
              <ol className="space-y-3">
                {history.map((e) => (
                  <li key={e.id} className="flex gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6B2B] shrink-0" />
                    <div className="min-w-0">
                      <p className="ds-body text-foreground break-words">
                        {EVENT_LABEL_TR[e.action] ?? e.action}
                        {typeof e.payload?.quantity === "number" && (
                          <span className="text-muted-foreground"> · {eventQty(e.payload)}</span>
                        )}
                      </p>
                      <p className="ds-caption text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" /> {ts(e.created_at)}
                        <span className="text-muted-foreground/70">
                          · {TRANSFER_STATUS_LABEL[e.status as TransferStatus] ?? e.status}
                        </span>
                      </p>
                      {e.note && <p className="ds-caption text-muted-foreground mt-0.5 break-words">{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>
      </PageShell>

      <TransferActionDialog
        action={action}
        transfer={action ? transfer : null}
        materialName={materialName}
        onClose={() => setAction(null)}
      />
    </>
  );
}
