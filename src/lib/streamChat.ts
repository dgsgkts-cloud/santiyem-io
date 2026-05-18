type Msg = { role: "user" | "assistant"; content: string; attachments?: { base64: string; type: string }[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const TIMEOUT_MS = 15000;

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const controller = new AbortController();
  let receivedAnyChunk = false;
  const timeoutId = setTimeout(() => {
    if (!receivedAnyChunk) {
      console.error("[AI] Timeout reached (15s), aborting request");
      controller.abort();
    }
  }, TIMEOUT_MS);

  console.log("[AI] → POST", CHAT_URL, "msgs:", messages.length);

  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    console.log("[AI] ← status:", resp.status, "ok:", resp.ok);

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({ error: "Bağlantı hatası" }));
      console.error("[AI] HTTP error:", resp.status, data);
      clearTimeout(timeoutId);
      onError("AI şu an yanıt veremiyor, lütfen tekrar dene");
      return;
    }

    if (!resp.body) {
      console.error("[AI] No response body — streaming may not be supported in this environment");
      clearTimeout(timeoutId);
      onError("AI şu an yanıt veremiyor, lütfen tekrar dene");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedAnyChunk = true;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (!line.startsWith("data: ") || line.trim() === "") continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) onDelta(text);
        } catch {
          // partial JSON, skip
        }
      }
    }

    clearTimeout(timeoutId);
    console.log("[AI] ✓ stream complete");
    onDone();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      console.error("[AI] Aborted (timeout or cancel)");
      onError("AI şu an yanıt veremiyor, lütfen tekrar dene");
    } else {
      console.error("[AI] Network/CORS error:", err?.message || err, err);
      onError("AI şu an yanıt veremiyor, lütfen tekrar dene");
    }
  }
}
