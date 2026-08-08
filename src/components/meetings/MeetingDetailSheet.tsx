import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateMeetingPdf } from "@/lib/meetingPdf";
import { useMeetingDetail } from "@/hooks/useMeetingDetail";
import {
  MeetingActionItem, PRIORITY_LABEL, applySpeakerMap, confidenceTone, speakerName, stageMeta,
} from "@/lib/meetings/meetingModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Sparkles, Download, Loader2, CheckCircle2, ListChecks, FileText, MessageSquare, Users,
  AlertTriangle, ChevronDown, Quote, CalendarClock, UserRound, Play, X, Wand2,
} from "lucide-react";

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

type Props = {
  meetingId: string;
  fallbackTitle: string;
  projectName: string | null;
  onClose: () => void;
};

/**
 * Toplantı detayı — AI aksiyon motoru görünümü.
 * Sıralama bilinçli: Özet → Aksiyonlar → Kararlar → Açık Konular → Transkript.
 */
export default function MeetingDetailSheet({ meetingId, fallbackTitle, projectName, onClose }: Props) {
  const d = useMeetingDetail(meetingId);
  const { meeting, analysis, transcript, participants, actionItems, speakerMap } = d;
  const stage = stageMeta(meeting?.pipeline_stage);

  const pending = actionItems.filter((a) => a.status === "pending");
  const handled = actionItems.filter((a) => a.status !== "pending");

  const detectedSpeakers = useMemo(() => {
    const fromTranscript = transcript.map((t) => t.speaker_label).filter(Boolean) as string[];
    return [...new Set([...(analysis?.speakers || []), ...fromTranscript])].sort();
  }, [analysis, transcript]);

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-6">{meeting?.title || fallbackTitle}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {[
              meeting?.started_at ? new Date(meeting.started_at).toLocaleString("tr-TR") : null,
              projectName,
            ].filter(Boolean).join(" · ")}
          </p>
        </SheetHeader>

        {/* Boru hattı durumu — kullanıcı hangi adımda olduğunu her zaman görür */}
        <div className="mt-4 rounded-card border border-border bg-card px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            {stage.busy
              ? <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              : meeting?.pipeline_stage === "ready"
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{stage.label}</p>
              <p className="text-xs text-muted-foreground">{meeting?.pipeline_error || stage.hint}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="secondary" className="gap-2 h-9" disabled={d.running} onClick={() => void d.runAnalysis()}>
            {d.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analysis ? "Yeniden Analiz Et" : "AI Analizi Başlat"}
          </Button>
          {analysis && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 h-9"
              disabled={d.running}
              onClick={() => void d.runAnalysis({ skipDiarization: true })}
              title="Konuşmacı ayrımını koruyup sadece özet/aksiyonları yeniler"
            >
              <Wand2 className="w-3.5 h-3.5" /> Sadece Analizi Yenile
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="gap-2 h-9"
            onClick={() =>
              generateMeetingPdf({
                meeting: { title: meeting?.title || fallbackTitle, started_at: meeting?.started_at },
                analysis: analysis
                  ? { ...analysis, action_items: actionItems.map((a) => ({ ...a, assignee: a.assignee_name || undefined })) }
                  : null,
                participants,
                projectName,
              })
            }
          >
            <Download className="w-3.5 h-3.5" /> PDF İndir
          </Button>
        </div>

        {d.loading ? (
          <div className="mt-6 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="ds-skeleton h-16 rounded-xl" />)}</div>
        ) : (
          <div className="mt-6 space-y-7">
            {/* 1 — Özet */}
            <Section title="Özet" icon={FileText}>
              {analysis?.summary
                ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{applySpeakerMap(analysis.summary, speakerMap)}</p>
                : <Empty text={stage.busy ? "Özet hazırlanıyor…" : "Bu toplantı için henüz özet üretilmedi."} />}
            </Section>

            {/* 2 — Aksiyonlar (motorun kalbi) */}
            <Section
              title="Aksiyonlar"
              icon={ListChecks}
              count={pending.length}
              right={pending.length > 1 && meeting?.project_id ? (
                <Button size="sm" variant="secondary" className="h-8 gap-1.5" onClick={() => void d.convertMany(pending)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tümünü Göreve Çevir
                </Button>
              ) : undefined}
            >
              {pending.length === 0 && handled.length === 0 ? (
                <Empty text={stage.busy ? "Aksiyonlar çıkarılıyor…" : "AI bu toplantıda net bir aksiyon maddesi bulamadı."} />
              ) : (
                <div className="space-y-2.5">
                  {pending.map((a) => (
                    <ActionCard
                      key={a.id}
                      item={a}
                      speakerMap={speakerMap}
                      busy={d.busyId === a.id}
                      hasProject={!!meeting?.project_id}
                      onPatch={(patch) => void d.patchItem(a.id, patch)}
                      onConvert={() => void d.convertToTask(a)}
                      onReject={() => void d.rejectItem(a)}
                    />
                  ))}
                  {handled.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-card border border-border px-3.5 py-2.5">
                      <p className="text-sm min-w-0 truncate">{a.title}</p>
                      <Badge variant="secondary" className="shrink-0">
                        {a.status === "converted" ? "Görev" : a.status === "rejected" ? "Reddedildi" : a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* 3 — Kararlar */}
            <Section title="Kararlar" icon={CheckCircle2} count={analysis?.decisions?.length}>
              {analysis?.decisions?.length ? (
                <ul className="space-y-2.5">
                  {analysis.decisions.map((dec, i) => (
                    <li key={i} className="rounded-card border border-border px-3.5 py-2.5">
                      <p className="text-sm font-medium">{applySpeakerMap(dec.title || "", speakerMap)}</p>
                      {dec.detail && <p className="text-xs text-muted-foreground mt-1">{applySpeakerMap(dec.detail, speakerMap)}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {dec.speaker && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <UserRound className="w-3 h-3" /> {speakerName(dec.speaker, speakerMap)}
                          </span>
                        )}
                        <ConfidenceChip value={dec.confidence} />
                      </div>
                      {dec.source_quote && <QuoteLine text={applySpeakerMap(dec.source_quote, speakerMap)} />}
                    </li>
                  ))}
                </ul>
              ) : <Empty text={stage.busy ? "Kararlar çıkarılıyor…" : "Net bir karar kaydı bulunamadı."} />}
            </Section>

            {/* 4 — Açık Konular */}
            <Section title="Açık Konular" icon={MessageSquare} count={analysis?.open_questions?.length}>
              {analysis?.open_questions?.length ? (
                <ul className="space-y-2">
                  {analysis.open_questions.map((q, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-medium">{applySpeakerMap(q.question || "", speakerMap)}</p>
                      {q.context && <p className="text-xs text-muted-foreground mt-0.5">{applySpeakerMap(q.context, speakerMap)}</p>}
                      {q.owner && <p className="text-[11px] text-muted-foreground mt-0.5">Takip: {q.owner}</p>}
                    </li>
                  ))}
                </ul>
              ) : analysis?.questions?.length ? (
                <ul className="space-y-1 text-sm">{analysis.questions.map((q, i) => <li key={i}>• {q}</li>)}</ul>
              ) : <Empty text="Açık kalan bir konu tespit edilmedi." />}
            </Section>

            {!!analysis?.risks?.length && (
              <Section title="Riskler" icon={AlertTriangle} count={analysis.risks.length}>
                <ul className="space-y-1.5 text-sm">
                  {analysis.risks.map((r, i) => (
                    <li key={i}>• {r.title}{r.impact && <span className="text-xs text-muted-foreground ml-2">[{r.impact}]</span>}</li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 5 — Katılımcılar + konuşmacı eşleştirme */}
            <Section title="Katılımcılar & Konuşmacılar" icon={Users}>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {participants.map((p, i) => <Badge key={i} variant="secondary">{p.display_name}</Badge>)}
                </div>
              )}
              {detectedSpeakers.length ? (
                <SpeakerMapper
                  speakers={detectedSpeakers}
                  value={speakerMap}
                  participants={participants.map((p) => p.display_name)}
                  onSave={(map) => void d.saveSpeakerMap(map)}
                />
              ) : (
                <Empty text="Konuşmacı ayrımı yapılmadı. Analizi çalıştırdığınızda konuşmacılar tespit edilir." />
              )}
            </Section>

            {/* 6 — Ses kaydı */}
            {meeting?.audio_path && <AudioSection prefix={meeting.audio_path} />}

            {/* 7 — Transkript (en altta, kapalı) */}
            {transcript.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between rounded-card border border-border px-3.5 py-3 text-sm font-medium hover:bg-muted/40 transition-colors">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> Transkript ({transcript.length} bölüm)</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto text-sm pr-1">
                    {transcript.map((t) => (
                      <div key={t.id}>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="tabular-nums">{fmtTime(Math.round(t.started_at_ms / 1000))}</span>
                          {t.speaker_label && <span className="font-medium text-foreground">{speakerName(t.speaker_label, speakerMap)}</span>}
                          {t.speaker_confidence != null && t.speaker_confidence < 0.5 && <span>· belirsiz</span>}
                        </div>
                        <p className="leading-relaxed">{t.text}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionCard({
  item, speakerMap, busy, hasProject, onPatch, onConvert, onReject,
}: {
  item: MeetingActionItem;
  speakerMap: Record<string, string>;
  busy: boolean;
  hasProject: boolean;
  onPatch: (patch: Partial<MeetingActionItem>) => void;
  onConvert: () => void;
  onReject: () => void;
}) {
  const [assignee, setAssignee] = useState(item.assignee_name || "");
  const [due, setDue] = useState(item.due_date || "");

  return (
    <div className="rounded-card border border-border bg-card px-3.5 py-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium flex-1">{item.title}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground shrink-0">
          {PRIORITY_LABEL[item.priority] || item.priority}
        </span>
      </div>
      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {item.speaker_label && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <UserRound className="w-3 h-3" /> {speakerName(item.speaker_label, speakerMap)}
          </span>
        )}
        <ConfidenceChip value={item.confidence} />
      </div>

      {item.source_quote && <QuoteLine text={item.source_quote} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><UserRound className="w-3 h-3" /> Sorumlu</span>
          <Input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            onBlur={() => { if ((item.assignee_name || "") !== assignee) onPatch({ assignee_name: assignee || null }); }}
            placeholder="Sorumlu belirtilmedi"
            className="h-10 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1"><CalendarClock className="w-3 h-3" /> Son tarih</span>
          <Input
            type="date"
            value={due}
            onChange={(e) => { setDue(e.target.value); onPatch({ due_date: e.target.value || null }); }}
            className="h-10 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        <Button size="sm" className="h-10 gap-1.5" disabled={busy} onClick={onConvert}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Onayla ve Görev Oluştur
        </Button>
        <Button size="sm" variant="ghost" className="h-10 gap-1.5" onClick={onReject}>
          <X className="w-3.5 h-3.5" /> Reddet
        </Button>
      </div>
      {!hasProject && (
        <p className="text-[11px] text-amber-500">
          Görev oluşturmak için toplantının bir projeye bağlı olması gerekir.
        </p>
      )}
    </div>
  );
}

function SpeakerMapper({
  speakers, value, participants, onSave,
}: {
  speakers: string[];
  value: Record<string, string>;
  participants: string[];
  onSave: (map: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({ ...value });
  const dirty = speakers.some((s) => (draft[s] || "") !== (value[s] || ""));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        AI konuşmacıları ayırdı. Gerçek isimleri eşleştirdiğinizde özet, kararlar ve transkript bu isimlerle gösterilir.
      </p>
      {speakers.map((s) => (
        <div key={s} className="flex items-center gap-2">
          <span className="text-xs w-28 shrink-0 text-muted-foreground">{s}</span>
          <Input
            list="meeting-participant-names"
            value={draft[s] || ""}
            onChange={(e) => setDraft((p) => ({ ...p, [s]: e.target.value }))}
            placeholder="Gerçek isim"
            className="h-10 text-sm"
          />
        </div>
      ))}
      <datalist id="meeting-participant-names">
        {participants.map((p) => <option key={p} value={p} />)}
      </datalist>
      {dirty && (
        <Button size="sm" className="h-9" onClick={() => onSave(draft)}>Eşleştirmeyi Kaydet</Button>
      )}
    </div>
  );
}

function AudioSection({ prefix }: { prefix: string }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: files, error } = await supabase.storage.from("meeting-audio").list(prefix, { limit: 200 });
      if (error) throw error;
      const names = (files || []).filter((f) => f.name.endsWith(".webm") || f.name.endsWith(".mp4")).map((f) => `${prefix}/${f.name}`);
      if (!names.length) { setUrls([]); return; }
      const { data: signed } = await supabase.storage.from("meeting-audio").createSignedUrls(names, 3600);
      setUrls((signed || []).map((s) => s.signedUrl).filter(Boolean) as string[]);
    } catch {
      toast.error("Ses kaydı açılamadı");
      setUrls([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Ses Kaydı" icon={Play}>
      {urls === null ? (
        <Button size="sm" variant="secondary" className="h-9 gap-1.5" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Kaydı Yükle
        </Button>
      ) : urls.length === 0 ? (
        <Empty text="Bu toplantı için saklanmış ses kaydı bulunamadı." />
      ) : (
        <div className="space-y-2">
          {urls.map((u, i) => (
            <div key={u} className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Bölüm {i + 1}</p>
              <audio controls preload="none" src={u} className="w-full" />
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function Section({
  title, icon: Icon, count, right, children,
}: {
  title: string;
  icon: any;
  count?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {typeof count === "number" && count > 0 && (
            <span className="text-[11px] text-muted-foreground">({count})</span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-muted-foreground">{text}</p>;

const QuoteLine = ({ text }: { text: string }) => (
  <p className="text-xs text-muted-foreground italic flex gap-1.5 border-l-2 border-border pl-2">
    <Quote className="w-3 h-3 shrink-0 mt-0.5" /> {text}
  </p>
);

function ConfidenceChip({ value }: { value?: number | null }) {
  const { label, tone } = confidenceTone(value);
  const cls =
    tone === "positive" ? "text-emerald-500 border-emerald-500/30"
      : tone === "attention" ? "text-amber-500 border-amber-500/30"
        : tone === "overdue" ? "text-rose-500 border-rose-500/30"
          : "text-muted-foreground border-border";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}
