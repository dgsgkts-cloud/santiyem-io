import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

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

const DISMISSED_KEY = "notifications_dismissed";

function getDismissedIds(): { ids: string[]; date: string } {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return { ids: [], date: "" };
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return { ids: [], date: "" };
    return parsed;
  } catch {
    return { ids: [], date: "" };
  }
}

function dismissIds(ids: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = getDismissedIds();
  const merged = Array.from(new Set([...existing.ids, ...ids]));
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({ ids: merged, date: today }));
}

export function useNotifications() {
  const { user } = useUser();
  const [reminders, setReminders] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds().ids);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
      const [r, m, p] = await Promise.all([
        supabase.from("reminders").select("*").eq("user_id", user.id),
        supabase.from("project_milestones").select("*").eq("user_id", user.id),
        supabase.from("projects").select("id, name").eq("user_id", user.id),
      ]);
      setReminders(r.data || []);
      setMilestones(m.data || []);
      setProjects(p.data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

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
      // Parse date like "01.05.2026" or ISO
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

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !dismissedIds.includes(n.id)).length;
  }, [notifications, dismissedIds]);

  const markAsRead = (ids: string[]) => {
    dismissIds(ids);
    setDismissedIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    markAsRead(allIds);
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismissedIds };
}
