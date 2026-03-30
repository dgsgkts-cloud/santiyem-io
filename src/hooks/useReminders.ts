import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Reminder {
  id: string;
  title: string;
  reminder_date: string;
  note: string;
  done: boolean;
}

const STORAGE_KEY = "muhendisai_reminders";

export function useReminders() {
  const { user } = useUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from DB or localStorage
  const loadReminders = useCallback(async () => {
    if (user) {
      setLoading(true);
      const { data } = await supabase
        .from("reminders")
        .select("id, title, reminder_date, note, done")
        .eq("user_id", user.id)
        .order("reminder_date", { ascending: true });
      if (data) setReminders(data.map(r => ({ ...r, note: r.note || "" })));
      setLoading(false);
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setReminders(parsed.map((r: any) => ({
            id: r.id,
            title: r.title,
            reminder_date: r.date || r.reminder_date,
            note: r.note || "",
            done: r.done || false,
          })));
        }
      } catch { /* empty */ }
    }
  }, [user]);

  useEffect(() => { loadReminders(); }, [loadReminders]);

  const addReminder = useCallback(async (title: string, date: string, note: string) => {
    if (user) {
      // Check limit
      const { count } = await supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) >= 20) {
        toast.error("Maksimum 20 hatırlatıcı ekleyebilirsiniz.");
        return false;
      }
      const { error } = await supabase.from("reminders").insert({
        user_id: user.id,
        title,
        reminder_date: date,
        note,
      });
      if (error) { toast.error("Eklenemedi"); return false; }
      loadReminders();
    } else {
      if (reminders.length >= 20) {
        toast.error("Maksimum 20 hatırlatıcı ekleyebilirsiniz.");
        return false;
      }
      const newR: Reminder = { id: Date.now().toString(), title, reminder_date: date, note, done: false };
      const updated = [...reminders, newR].sort((a, b) => a.reminder_date.localeCompare(b.reminder_date));
      setReminders(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    toast.success("Hatırlatıcı eklendi");
    return true;
  }, [user, reminders, loadReminders]);

  const toggleDone = useCallback(async (id: string) => {
    const r = reminders.find(x => x.id === id);
    if (!r) return;
    if (user) {
      await supabase.from("reminders").update({ done: !r.done }).eq("id", id);
      loadReminders();
    } else {
      const updated = reminders.map(x => x.id === id ? { ...x, done: !x.done } : x);
      setReminders(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [user, reminders, loadReminders]);

  const deleteReminder = useCallback(async (id: string) => {
    if (user) {
      await supabase.from("reminders").delete().eq("id", id);
      loadReminders();
    } else {
      const updated = reminders.filter(x => x.id !== id);
      setReminders(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    toast.success("Hatırlatıcı silindi");
  }, [user, reminders, loadReminders]);

  return { reminders, loading, addReminder, toggleDone, deleteReminder };
}
