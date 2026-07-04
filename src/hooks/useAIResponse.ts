// useAIResponse — parses an assistant response (string or object) into a
// normalized `{ speech, ui }` shape so <AIResponseRenderer /> can render the
// appropriate React component while the assistant speaks the text.
//
// Accepted inputs:
//   1. Object:  { speech: "...", ui: { type: "table", ... } }
//   2. Object with `ui` array: { speech, ui: [ {...}, {...} ] }
//   3. String containing ```json ui { ... } ``` fenced payloads
//   4. String containing ::ui { ... } ::/ui blocks
//   5. String containing a trailing {"ui": { ... }} JSON tail
//
// Returned `speech` is the text with all ui payloads stripped out.
// Returned `ui` is always AIUiPayload[] (possibly empty).

import { useMemo } from "react";
import type { AIUiPayload } from "@/components/ai/AIResponseRenderer";

export type AIResponseInput =
  | string
  | { speech?: string; text?: string; content?: string; ui?: AIUiPayload | AIUiPayload[] | null }
  | null
  | undefined;

export type AIResponseParsed = { speech: string; ui: AIUiPayload[] };

const tryParse = (s: string): any => {
  try { return JSON.parse(s); } catch { return null; }
};

export const parseAIResponse = (input: AIResponseInput): AIResponseParsed => {
  if (input == null) return { speech: "", ui: [] };

  // Object input
  if (typeof input === "object") {
    const speech = input.speech ?? input.text ?? input.content ?? "";
    const ui = input.ui == null ? [] : Array.isArray(input.ui) ? input.ui : [input.ui];
    return { speech: String(speech), ui: ui as AIUiPayload[] };
  }

  // String input — try full-string JSON first
  const trimmed = input.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const parsed = tryParse(trimmed);
    if (parsed && (parsed.speech || parsed.ui)) {
      const ui = parsed.ui == null ? [] : Array.isArray(parsed.ui) ? parsed.ui : [parsed.ui];
      return { speech: String(parsed.speech ?? parsed.text ?? ""), ui };
    }
  }

  const ui: AIUiPayload[] = [];
  let text = input;

  // ```json ui { ... } ```  or  ```ui { ... } ```
  text = text.replace(/```(?:json)?\s*ui\s*\n([\s\S]*?)```/gi, (_m, body) => {
    const p = tryParse(body);
    if (p) (Array.isArray(p) ? p : [p]).forEach((x) => ui.push(x));
    return "";
  });

  // ::ui { ... } ::/ui
  text = text.replace(/::ui[^\n]*\n([\s\S]*?)\n?::\/ui/gi, (_m, body) => {
    const p = tryParse(body);
    if (p) (Array.isArray(p) ? p : [p]).forEach((x) => ui.push(x));
    return "";
  });

  // Trailing {"ui": { ... }} tail
  const tail = text.match(/\{\s*"ui"\s*:\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*\}\s*$/);
  if (tail) {
    const p = tryParse(tail[0]);
    if (p?.ui) (Array.isArray(p.ui) ? p.ui : [p.ui]).forEach((x: any) => ui.push(x));
    text = text.slice(0, tail.index).trimEnd();
  }

  return { speech: text.trim(), ui };
};

export const useAIResponse = (input: AIResponseInput): AIResponseParsed =>
  useMemo(() => parseAIResponse(input), [input]);

export default useAIResponse;
