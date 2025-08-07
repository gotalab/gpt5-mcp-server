import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

// Silently load .env without emitting any logs to STDOUT/STDERR
(() => {
  try {
    const candidates: string[] = [];
    // 1) Explicit ENV_FILE path (absolute or relative to current process)
    if (process.env.ENV_FILE && process.env.ENV_FILE.trim() !== "") {
      candidates.push(path.resolve(process.cwd(), process.env.ENV_FILE));
    }
    // 2) CWD/.env
    candidates.push(path.resolve(process.cwd(), ".env"));
    // 3) dist/.. (project root)/.env fallback
    try {
      const fileDir = path.dirname(fileURLToPath(import.meta.url));
      candidates.push(path.resolve(fileDir, "..", ".env"));
    } catch {
      // ignore
    }

    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          const file = fs.readFileSync(p);
          const parsed = parse(file);
          for (const [k, v] of Object.entries(parsed)) {
            if (process.env[k] === undefined) process.env[k] = v;
          }
          break; // stop after first found
        }
      } catch {
        // keep trying other candidates
      }
    }
  } catch {
    // ignore .env load errors silently
  }
})();

export type ReasoningEffort = "minimal" | "medium" | "high";
export type Verbosity = "low" | "medium" | "high";
export type SearchContextSize = "low" | "medium" | "high";

export interface AppConfig {
  apiKey: string | undefined;
  model: string;
  maxRetries: number;
  timeoutMs: number;
  reasoningEffort?: ReasoningEffort;
  defaultVerbosity?: Verbosity;
  webSearchDefaultEnabled: boolean;
  webSearchContextSize?: SearchContextSize;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function toNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeReasoningEffort(value: string | undefined): ReasoningEffort {
  const v = (value ?? "medium").toLowerCase();
  if (v === "low" || v === "minimal") return "minimal";
  if (v === "high") return "high";
  return "medium";
}

export const config: AppConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || "gpt-5",
  maxRetries: toNumber(process.env.OPENAI_MAX_RETRIES, 3),
  timeoutMs: toNumber(process.env.OPENAI_TIMEOUT_MS, 60_000),
  reasoningEffort: normalizeReasoningEffort(process.env.REASONING_EFFORT),
  defaultVerbosity: (process.env.DEFAULT_VERBOSITY as Verbosity | undefined) ?? "medium",
  webSearchDefaultEnabled: toBoolean(process.env.WEB_SEARCH_DEFAULT_ENABLED, false),
  webSearchContextSize: (process.env.WEB_SEARCH_CONTEXT_SIZE as SearchContextSize | undefined) ?? "medium",
};
