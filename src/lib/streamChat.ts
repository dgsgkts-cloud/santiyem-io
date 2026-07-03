type Msg = { role: "user" | "assistant"; content: string; attachments?: { base64: string; type: string }[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
// Time to wait for the server to START responding (headers received).
// The Construction Brain runs intent classification, DB retrieval and, in
// action mode, a multi-step tool-calling loop before the first SSE chunk
// arrives — so we only enforce this timeout until headers are received,
// and give it enough room for the slowest cold-start path.
const CONNECT_TIMEOUT_MS = 60000;

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
  let headersReceived = false;
  const timeoutId = setTimeout(() => {
    if (!headersReceived) {
      console.error("[AI] Connect timeout reached, aborting request");
      controller.abort();
    }
  }, CONNECT_TIMEOUT_MS);

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

    // Headers are back — server is alive. Cancel the connect timeout so a
    // long tool-loop / DB retrieval doesn't get killed before the first
    // SSE chunk lands.
    headersReceived = true;
    clearTimeout(timeoutId);

    console.log("[AI] ← status:", resp.status, "ok:", resp.ok);

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({ error: "Bağlantı hatası" }));
      console.error("[AI] HTTP error:", resp.status, data);
      onError("AI şu an yanıt veremiyor, lütfen tekrar dene");
      return;
    }

    if (!resp.body) {
      console.error("[AI] No response body — streaming may not be supported in this environment");
      onError("AI şu an yanıt veremiyor, lütfen tekrar dene");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
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
