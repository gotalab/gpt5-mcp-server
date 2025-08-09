import { describe, it, expect, beforeEach, vi } from "vitest";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// IMPORTANT: clear the module cache and process.env before each test
function resetEnv() {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("OPENAI_") || k === "ENV_FILE" || k === "DEFAULT_VERBOSITY" || k.startsWith("WEB_SEARCH_")) {
      delete (process.env as any)[k];
    }
  }
}

// Dynamically import config after env setup
async function loadConfig() {
  vi.resetModules();
  const mod = await import("../src/config.ts");
  return mod;
}

describe("config.ts", () => {
  beforeEach(() => {
    resetEnv();
  });

  it("falls back to defaults when env missing", async () => {
    // Force loader to use an empty env file and stop searching
    const here = fileURLToPath(new URL("./", import.meta.url));
    process.env.ENV_FILE = path.resolve(here, "fixtures/.env.empty");
    const { config } = await loadConfig();
    expect(config.model).toBe("gpt-5");
    expect(config.maxRetries).toBe(3);
    expect(config.timeoutMs).toBe(60000);
    expect(config.defaultVerbosity).toBe("medium");
    expect(config.webSearchDefaultEnabled).toBe(false);
    expect(config.webSearchContextSize).toBe("medium");
  });

  it("reads from ENV_FILE when provided", async () => {
    const here = fileURLToPath(new URL("./", import.meta.url));
    const envPath = path.resolve(here, "fixtures/.env.sample");
    process.env.ENV_FILE = envPath;
    const { config } = await loadConfig();
    expect(config.apiKey).toBe("sk-test-from-file");
    expect(config.timeoutMs).toBe(120000);
    expect(config.reasoningEffort).toBe("minimal");
  });

  it("normalizes reasoning_effort: low -> minimal", async () => {
    process.env.REASONING_EFFORT = "low";
    const { config } = await loadConfig();
    expect(config.reasoningEffort).toBe("minimal");
  });

  it("boolean coercion for WEB_SEARCH_DEFAULT_ENABLED", async () => {
    process.env.WEB_SEARCH_DEFAULT_ENABLED = "true";
    const { config } = await loadConfig();
    expect(config.webSearchDefaultEnabled).toBe(true);
  });
});
