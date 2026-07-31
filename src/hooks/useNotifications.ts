import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  type: "reminder" | "milestone";
  title: string;
  message: string;
  daysLeft: number; // negative = overdue
  completed: boolean;
  targetTab: string;
  targetProjectId?: string;
  sourceDate: string;
}

/* ────────────────────────────────────────────────────────────────
   Single source of truth.
   Read state lives in `public.notification_reads` (user-scoped),
   mirrored in a module-level store so every bell / drawer / badge
   in the app reads the exact same unread count.
   ──────────────────────────────────────────────────────────────── */

interface Snapshot {
  userId: string | null;
  reminders: any[];
  milestones: any[];
  projects: any[];
  readKeys: string[];
  loading: boolean;
  /** keys with an in-flight read mutation — used to block duplicate writes */
  pending: string[];
  bulkRunning: boolean;
}

let snapshot: Snapshot = {
  userId: null,
  reminders: [],
  milestones: [],
  projects: [],
  readKeys: [],
  loading: true,
  pending: [],
  bulkRunning: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setState = (patch: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...patch };
  emit();
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => snapshot;

let loadPromise: Promise<void> | null = null;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

async function loadAll(userId: string) {
  const [r, m, p, reads] = await Promise.all([
    supabase.from("reminders").select("*").eq("user_id", userId),
    supabase.from("project_milestones").select("*").eq("user_id", userId),
    supabase.from("projects").select("id, name").eq("user_id", userId),
    supabase.from("notification_reads").select("notification_key").eq("user_id", userId),
  ]);
  setState({
    reminders: r.data || [],
    milestones: m.data || [],
    projects: p.data || [],
    readKeys: (reads.data || []).map((x: any) => x.notification_key),
    loading: false,
  });
}

async function refetchReads(userId: string) {
  const { data } = await supabase
    .from("notification_reads")
    .select("notification_key")
    .eq("user_id", userId);
  if (!data) return;
  // Preserve optimistic keys that the server has not confirmed yet.
  const server = data.map((x: any) => x.notification_key);
  const merged = Array.from(new Set([...server, ...snapshot.pending]));
  setState({ readKeys: merged });
}

function ensureStore(userId: string | null) {
  if (!userId) {
    if (snapshot.userId !== null) {
      loadPromise = null;
      if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
      setState({ userId: null, reminders: [], milestones: [], projects: [], readKeys: [], loading: false, pending: [], bulkRunning: false });
    } else if (snapshot.loading) {
      setState({ loading: false });
    }
    return;
  }
  if (snapshot.userId === userId && loadPromise) return;

  snapshot = { ...snapshot, userId, loading: true };
  emit();
  loadPromise = loadAll(userId);

  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`notification-reads-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notification_reads", filter: `user_id=eq.${userId}` },
      () => { refetchReads(userId); },
    )
    .subscribe();
}

/** Idempotent, user-scoped upsert with a single silent retry. */
async function persistReads(userId: string, keys: string[]): Promise<boolean> {
  const rows = keys.map((k) => ({ user_id: userId, notification_key: k, read_at: new Date().toISOString() }));
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase
      .from("notification_reads")
      .upsert(rows, { onConflict: "user_id,notification_key", ignoreDuplicates: false });
    if (!error) return true;
    if (attempt === 0) await new Promise((res) => setTimeout(res, 400));
  }
  return false;
}

export function useNotifications() {
  const { user } = useUser();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    ensureStore(user?.id ?? null);
  }, [user?.id]);

  const { reminders, milestones, projects, readKeys, loading, pending, bulkRunning } = state;

  const notifications = useMemo<AppNotification[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: AppNotification[] = [];

    // Reminders
    for (const r of reminders) {
      const date = new Date(r.reminder_date);
      date.setHours(0, 0, 0, 0);
      const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let message: string;
      if (r.done) {
        message = "✅ Tamamlandı";
      } else if (diff < 0) {
        message = `⚠️ ${Math.abs(diff)} gün gecikmiş`;
      } else if (diff === 0) {
        message = "🔔 Bugün!";
      } else if (diff <= 3) {
        message = `⏰ ${diff} gün kaldı`;
      } else {
        continue; // skip far-future reminders
      }
      result.push({
        id: `reminder-${r.id}`,
        type: "reminder",
        title: r.title,
        message,
        daysLeft: diff,
        completed: r.done,
        targetTab: "reminders",
        sourceDate: r.reminder_date,
      });
    }

    // Milestones
    const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));
    for (const m of milestones) {
      if (!m.milestone_date) continue;
      let date: Date;
      if (m.milestone_date.includes(".")) {
        const parts = m.milestone_date.split(".");
        date = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      } else {
        date = new Date(m.milestone_date);
      }
      if (isNaN(date.getTime())) continue;
      date.setHours(0, 0, 0, 0);
      const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let message: string;
      const projectName = projectMap.get(m.project_id) || "Proje";
      if (m.completed) {
        message = `✅ Tamamlandı — ${projectName}`;
      } else if (diff < 0) {
        message = `⚠️ ${Math.abs(diff)} gün gecikmiş — ${projectName}`;
      } else if (diff === 0) {
        message = `🔔 Bugün! — ${projectName}`;
      } else if (diff <= 5) {
        message = `⏰ ${diff} gün kaldı — ${projectName}`;
      } else {
        continue;
      }
      result.push({
        id: `milestone-${m.id}`,
        type: "milestone",
        title: m.title,
        message,
        daysLeft: diff,
        completed: m.completed,
        targetTab: "projects",
        targetProjectId: m.project_id,
        sourceDate: m.milestone_date,
      });
    }

    // Sort: overdue first, then by days left
    result.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.daysLeft - b.daysLeft;
    });

    return result;
  }, [reminders, milestones, projects]);

  const readSet = useMemo(() => new Set(readKeys), [readKeys]);

  const unreadCount = useMemo(
    () => Math.max(0, notifications.filter((n) => !readSet.has(n.id)).length),
    [notifications, readSet],
  );

  const markAsRead = useCallback(
    async (ids: string[]) => {
      const userId = snapshot.userId;
      if (!userId) return;
      // idempotent: skip already-read and in-flight keys
      const targets = ids.filter((id) => !snapshot.readKeys.includes(id) && !snapshot.pending.includes(id));
      if (targets.length === 0) return;

      // optimistic
      setState({
        readKeys: Array.from(new Set([...snapshot.readKeys, ...targets])),
        pending: Array.from(new Set([...snapshot.pending, ...targets])),
      });

      const ok = await persistReads(userId, targets);

      setState({ pending: snapshot.pending.filter((k) => !targets.includes(k)) });
      if (!ok) {
        setState({ readKeys: snapshot.readKeys.filter((k) => !targets.includes(k)) });
        toast.error("Bildirim durumu kaydedilemedi.");
      }
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    if (snapshot.bulkRunning) return;
    const userId = snapshot.userId;
    if (!userId) return;
    const targets = notifications.map((n) => n.id).filter((id) => !snapshot.readKeys.includes(id));
    if (targets.length === 0) return;

    setState({
      bulkRunning: true,
      readKeys: Array.from(new Set([...snapshot.readKeys, ...targets])),
      pending: Array.from(new Set([...snapshot.pending, ...targets])),
    });

    const ok = await persistReads(userId, targets);

    setState({ pending: snapshot.pending.filter((k) => !targets.includes(k)), bulkRunning: false });
    if (!ok) {
      setState({ readKeys: snapshot.readKeys.filter((k) => !targets.includes(k)) });
      toast.error("Bildirimler okundu olarak kaydedilemedi.");
    }
  }, [notifications]);

  const isRead = useCallback((id: string) => readSet.has(id), [readSet]);

  /** Does the notification still point at an existing record? */
  const hasValidDestination = useCallback(
    (n: AppNotification) => {
      if (n.targetProjectId) return projects.some((p: any) => p.id === n.targetProjectId);
      return Boolean(n.targetTab);
    },
    [projects],
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    isRead,
    hasValidDestination,
    bulkRunning,
    pendingIds: pending,
    /** @deprecated use isRead() — kept for compatibility */
    dismissedIds: readKeys,
  };
}
