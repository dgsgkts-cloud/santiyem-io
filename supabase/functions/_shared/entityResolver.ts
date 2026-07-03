// ============================================================
// Intelligent Entity Recognition & Fuzzy Matching
// Shared across Şantiyem AI edge functions (chat, morning-briefing,
// meeting-analyze, …). Handles Turkish char folding, common voice
// transcription errors, aliases, and Levenshtein-based similarity.
// ============================================================

const TR_MAP: Record<string, string> = {
  "ı": "i", "İ": "i", "I": "i",
  "ş": "s", "Ş": "s",
  "ç": "c", "Ç": "c",
  "ö": "o", "Ö": "o",
  "ü": "u", "Ü": "u",
  "ğ": "g", "Ğ": "g",
};

/** Fold Turkish characters + lowercase + strip punctuation + collapse whitespace. */
export function normalizeTr(input: string): string {
  if (!input) return "";
  let out = "";
  for (const ch of input) out += TR_MAP[ch] ?? ch;
  return out
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common speech-to-text and typing mistakes that surface in Turkish
 * construction speech. Applied token-by-token BEFORE fuzzy matching so
 * "Arzut" reaches the resolver already looking like "arsuz".
 * Keep entries lowercase and already-normalized (no Turkish diacritics).
 */
const VOICE_CORRECTIONS: Record<string, string> = {
  // location / project fragments
  "arzut": "arsuz", "arsut": "arsuz", "arsus": "arsuz",
  "goktas": "goktas", "gokdas": "goktas", "goktash": "goktas",
  // materials
  "betorn": "beton", "betol": "beton", "beten": "beton",
  "demr": "demir", "demer": "demir",
  "cimente": "cimento", "cemento": "cimento",
  "tugla": "tugla",
  // domain words
  "hak edis": "hakedis", "hak edish": "hakedis", "hakedish": "hakedis",
  "santiye": "santiye", "shantiye": "santiye",
  "taseron": "taseron", "tasheron": "taseron", "taşoron": "taseron",
  // number/block words
  "a blok": "a blok", "ablok": "a blok",
  "b blok": "b blok", "bblok": "b blok",
};

export function applyVoiceCorrections(normalized: string): string {
  let out = ` ${normalized} `;
  for (const [wrong, right] of Object.entries(VOICE_CORRECTIONS)) {
    // whole-token / whole-phrase match
    const re = new RegExp(`(^|\\s)${wrong}(\\s|$)`, "g");
    out = out.replace(re, `$1${right}$2`);
  }
  return out.trim().replace(/\s+/g, " ");
}

// ---- Similarity: Levenshtein ratio + token overlap ----

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 0..1 similarity. Combines Levenshtein ratio with token overlap so that
 *  "Modern Villa" scores high against "Arsuz Modern Villa" even though the
 *  raw edit distance is large. */
export function similarity(a: string, b: string): number {
  const A = normalizeTr(a);
  const B = normalizeTr(b);
  if (!A || !B) return 0;
  if (A === B) return 1;

  const lev = 1 - levenshtein(A, B) / Math.max(A.length, B.length);

  const tokA = new Set(A.split(" ").filter(t => t.length >= 2));
  const tokB = new Set(B.split(" ").filter(t => t.length >= 2));
  let overlap = 0;
  for (const t of tokA) if (tokB.has(t)) overlap++;
  const union = new Set([...tokA, ...tokB]).size || 1;
  const jacc = overlap / union;

  // Substring bonus: "modern villa" fully contained in "arsuz modern villa"
  const contains =
    (A.length >= 4 && B.includes(A)) || (B.length >= 4 && A.includes(B)) ? 0.15 : 0;

  return Math.max(lev, jacc) + contains;
}

// ---- Alias registry ----

export interface EntityCandidate {
  id: string;
  name: string;
  aliases?: string[];
}

export interface ResolveOptions {
  /** Auto-select when the best score is >= this. Default 0.9. */
  autoSelectThreshold?: number;
  /** Include candidates with score >= this in the alternatives list. Default 0.6. */
  suggestThreshold?: number;
  /** How many alternatives to keep for clarification. Default 3. */
  maxAlternatives?: number;
}

export type ResolveOutcome =
  | { status: "none"; matches: []; corrected: string }
  | { status: "auto"; match: EntityCandidate; score: number; matches: Array<{ candidate: EntityCandidate; score: number }>; corrected: string }
  | { status: "ambiguous"; matches: Array<{ candidate: EntityCandidate; score: number }>; corrected: string };

/**
 * Resolve a free-text mention against a candidate list.
 *
 * Search order (per spec):
 *   1. Exact normalized match
 *   2. Alias match
 *   3. Substring / contains match
 *   4. Fuzzy similarity (Levenshtein + token overlap)
 *   5. Clarification (returned as `ambiguous`) or `none`
 */
export function resolveEntity(
  raw: string,
  candidates: EntityCandidate[],
  opts: ResolveOptions = {},
): ResolveOutcome {
  const autoT = opts.autoSelectThreshold ?? 0.9;
  const suggT = opts.suggestThreshold ?? 0.6;
  const maxAlt = opts.maxAlternatives ?? 3;

  const normalized = normalizeTr(raw);
  const corrected = applyVoiceCorrections(normalized);
  if (!corrected || !candidates.length) {
    return { status: "none", matches: [], corrected };
  }

  // 1) exact match on name or alias
  for (const c of candidates) {
    if (normalizeTr(c.name) === corrected) {
      return { status: "auto", match: c, score: 1, matches: [{ candidate: c, score: 1 }], corrected };
    }
    for (const a of c.aliases || []) {
      if (normalizeTr(a) === corrected) {
        return { status: "auto", match: c, score: 1, matches: [{ candidate: c, score: 1 }], corrected };
      }
    }
  }

  // 2..4) score everything (max of similarity against name + each alias)
  const scored = candidates.map(c => {
    const nameScore = similarity(corrected, c.name);
    let best = nameScore;
    for (const a of c.aliases || []) {
      const s = similarity(corrected, a);
      if (s > best) best = s;
    }
    return { candidate: c, score: best };
  });
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < suggT) {
    return { status: "none", matches: [], corrected };
  }

  const shortlist = scored.filter(s => s.score >= suggT).slice(0, maxAlt);

  // Auto-select if the top is confidently ahead of the runner-up
  const runner = shortlist[1];
  const clearlyAhead = !runner || top.score - runner.score >= 0.12;
  if (top.score >= autoT && clearlyAhead) {
    return { status: "auto", match: top.candidate, score: top.score, matches: shortlist, corrected };
  }

  return { status: "ambiguous", matches: shortlist, corrected };
}

/** Convenience: build a clarification sentence in Turkish. */
export function buildClarification(
  entityKind: string,
  matches: Array<{ candidate: EntityCandidate; score: number }>,
): string {
  if (!matches.length) return "";
  if (matches.length === 1) {
    return `${matches[0].candidate.name} ${entityKind}ini mi kastettiniz?`;
  }
  const names = matches.map(m => `"${m.candidate.name}"`).join(", ");
  return `Birden fazla ${entityKind} eşleşti: ${names}. Hangisini kastediyorsunuz?`;
}
