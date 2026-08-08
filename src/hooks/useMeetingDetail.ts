import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MeetingActionItem, MeetingAnalysis, SpeakerMap, TranscriptSegment, toTaskPriority,
} from "@/lib/meetings/meetingModel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type MeetingParticipant = {
  id?: string;
  display_name: string;
  company?: string | null;
  role?: string | null;
};

type MeetingRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  started_at: string | null;
  pipeline_stage: string | null;
  pipeline_error: string | null;
  speaker_map: SpeakerMap | null;
  audio_path: string | null;
};

/**
 * Bir toplantının tüm AI çıktısını yükler, boru hattı çalışırken kendini
 * tazeler ve aksiyon → görev dönüşümünü yönetir.
 */
export function useMeetingDetail(meetingId: string) {
  const [meeting, setMeeting] = useState<MeetingRow | null>(null);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    const [{ data: m }, { data: a }, { data: t }, { data: p }, { data: ai }] = await Promise.all([
      supabase
        .from("meetings")
        .select("id,title,status,project_id,started_at,pipeline_stage,pipeline_error,speaker_map,audio_path")
        .eq("id", meetingId)
        .maybeSingle(),
      supabase.from("meeting_analyses").select("*").eq("meeting_id", meetingId).maybeSingle(),
      supabase
        .from("meeting_transcripts")
        .select("id,seq,text,started_at_ms,speaker_label,speaker_confidence")
        .eq("meeting_id", meetingId)
        .order("seq"),
      supabase.from("meeting_participants").select("id,display_name,company,role").eq("meeting_id", meetingId),
      supabase.from("meeting_action_items").select("*").eq("meeting_id", meetingId).order("created_at"),
    ]);
    if (!aliveRef.current) return;
    setMeeting((m as any) || null);
    setAnalysis((a as any) || null);
    setTranscript((t as any) || []);
    setParticipants((p as any) || []);
    setActionItems((ai as any) || []);
    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    void load();
    return () => { aliveRef.current = false; };
  }, [load]);

  // Boru hattı çalışırken sayfa kendini tazeler (kullanıcı beklerken durum ilerler).
  const stage = meeting?.pipeline_stage || "idle";
  useEffect(() => {
    if (!["transcribing", "diarizing", "analyzing"].includes(stage)) return;
    const id = window.setInterval(() => { void load(); }, 4000);
    return () => window.clearInterval(id);
  }, [stage, load]);

  const speakerMap: SpeakerMap = (meeting?.speaker_map as SpeakerMap) || {};

  const runAnalysis = useCallback(async (opts?: { skipDiarization?: boolean }) => {
    setRunning(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/meeting-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess?.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ meeting_id: meetingId, skip_diarization: opts?.skipDiarization === true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || json?.error || "Analiz başarısız");
      if (json?.empty) toast.warning("Kayıttan konuşma metni çıkarılamadı.");
      else toast.success(`Analiz hazır · ${json?.action_item_count ?? 0} aksiyon önerisi`);
      await load();
      return json;
    } catch (e: any) {
      toast.error(e?.message || "Analiz başarısız");
      await load();
      return null;
    } finally {
      setRunning(false);
    }
  }, [meetingId, load]);

  /** Konuşmacı → gerçek kişi eşleştirmesini kaydeder (yeniden analiz gerekmez). */
  const saveSpeakerMap = useCallback(async (map: SpeakerMap) => {
    const clean: SpeakerMap = {};
    for (const [k, v] of Object.entries(map)) if (v?.trim()) clean[k] = v.trim();
    const { error } = await supabase.from("meetings").update({ speaker_map: clean } as any).eq("id", meetingId);
    if (error) { toast.error("Eşleştirme kaydedilemedi"); return; }
    setMeeting((prev) => (prev ? { ...prev, speaker_map: clean } : prev));

    // Sorumlusu boş olan aksiyonlar, konuşmacı eşleştirmesinden isim kazanır.
    const updates = actionItems.filter(
      (a) => a.status === "pending" && !a.assignee_name && a.speaker_label && clean[a.speaker_label],
    );
    if (updates.length) {
      await Promise.all(
        updates.map((a) =>
          supabase
            .from("meeting_action_items")
            .update({ assignee_name: clean[a.speaker_label!] })
            .eq("id", a.id),
        ),
      );
      await load();
    }
    toast.success("Konuşmacı eşleştirmesi kaydedildi");
  }, [meetingId, actionItems, load]);

  const patchItem = useCallback(async (id: string, patch: Partial<MeetingActionItem>) => {
    setActionItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from("meeting_action_items").update(patch as any).eq("id", id);
    if (error) { toast.error("Güncellenemedi"); await load(); }
  }, [load]);

  /** Onaylanan aksiyonu mevcut görev sistemine yazar. */
  const convertToTask = useCallback(async (item: MeetingActionItem) => {
    if (!meeting) return false;
    if (!meeting.project_id) {
      toast.error("Bu toplantı bir projeye bağlı değil — görev oluşturmak için önce proje seçin.");
      return false;
    }
    setBusyId(item.id);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) throw new Error("Oturum bulunamadı");

      const context = [
        `Toplantı: ${meeting.title}`,
        meeting.started_at ? `Tarih: ${new Date(meeting.started_at).toLocaleDateString("tr-TR")}` : null,
        item.assignee_name ? `Sorumlu: ${item.assignee_name}` : null,
        item.source_quote ? `Toplantıdan: "${item.source_quote}"` : null,
      ].filter(Boolean).join("\n");

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          created_by: uid,
          project_id: meeting.project_id,
          title: item.title,
          description: [item.description, context].filter(Boolean).join("\n\n"),
          due_date: item.due_date,
          priority: toTaskPriority(item.priority),
          status: "todo",
          assigned_to: item.assignee_user_id || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      await patchItem(item.id, { status: "converted", created_task_id: (task as any).id });
      toast.success("Görev oluşturuldu");
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Görev oluşturulamadı");
      return false;
    } finally {
      setBusyId(null);
    }
  }, [meeting, patchItem]);

  const convertMany = useCallback(async (items: MeetingActionItem[]) => {
    let ok = 0;
    for (const it of items) if (await convertToTask(it)) ok++;
    if (ok) toast.success(`${ok} aksiyon göreve dönüştürüldü`);
  }, [convertToTask]);

  const rejectItem = useCallback((item: MeetingActionItem) => patchItem(item.id, { status: "rejected" }), [patchItem]);

  return {
    meeting, analysis, transcript, participants, actionItems, speakerMap,
    loading, running, busyId,
    reload: load, runAnalysis, saveSpeakerMap, patchItem, convertToTask, convertMany, rejectItem,
  };
}
