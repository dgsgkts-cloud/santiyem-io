import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { Message } from "@/components/ChatMessage";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useConversations() {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!user) { setConversations([]); return; }
    const { data } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, attachments, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        attachments: m.attachments as unknown as Message["attachments"],
      })));
    }
    setActiveConversationId(conversationId);
    setLoading(false);
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    const title = firstMessage.slice(0, 60) || "Yeni Sohbet";
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (data) {
      setActiveConversationId(data.id);
      loadConversations();
      return data.id;
    }
    return null;
  }, [user, loadConversations]);

  // Save a message
  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string, attachments?: Message["attachments"]) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content,
      attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : null,
    });
    // Update conversation updated_at
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  }, [user]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase.from("conversations").delete().eq("id", conversationId);
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
    loadConversations();
  }, [activeConversationId, loadConversations]);

  // New chat
  const newChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    loading,
    loadConversations,
    loadMessages,
    createConversation,
    saveMessage,
    deleteConversation,
    newChat,
  };
}
