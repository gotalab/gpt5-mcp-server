import { describe, it, expect } from "vitest";
import { buildOpenAIRequest, type QueryInput } from "../src/openai.ts";
import type { AppConfig, ReasoningEffort, SearchContextSize, Verbosity } from "../src/config.ts";

function cfg(partial: Partial<AppConfig> = {}): AppConfig {
  return {
    apiKey: "sk-test",
    model: "gpt-5",
    maxRetries: 3,
    timeoutMs: 60000,
    reasoningEffort: "medium",
    defaultVerbosity: "medium",
    webSearchDefaultEnabled: false,
    webSearchContextSize: "medium",
    ...partial,
  } as AppConfig;
}

describe("buildOpenAIRequest", () => {
  it("builds minimal request with defaults", () => {
    const input: QueryInput = { query: "Hello" };
    const req = buildOpenAIRequest(input, cfg());
    expect(req).toMatchObject({
      model: "gpt-5",
      input: "Hello",
      tool_choice: "auto",
      parallel_tool_calls: true,
    });
    expect(req.tools).toBeUndefined();
    expect(req.reasoning).toEqual({ effort: "medium" });
    expect(req.text).toEqual({ verbosity: "medium" });
  });

  it("maps reasoning_effort low->minimal", () => {
    const input: QueryInput = { query: "q", reasoning_effort: "low" };
    const req = buildOpenAIRequest(input, cfg());
    expect(req.reasoning?.effort).toBe<ReasoningEffort>("minimal");
  });

  it("bumps minimal to medium when web_search enabled", () => {
    const input: QueryInput = { query: "q", reasoning_effort: "minimal", web_search: { enabled: true } };
    const req = buildOpenAIRequest(input, cfg());
    expect(req.reasoning?.effort).toBe<ReasoningEffort>("medium");
  });

  it("adds web_search_preview tool when enabled with context size", () => {
    const input: QueryInput = { query: "q", web_search: { enabled: true, search_context_size: "high" } };
    const req = buildOpenAIRequest(input, cfg());
    expect(req.tools).toEqual([
      { type: "web_search_preview", search_context_size: "high" satisfies SearchContextSize },
    ]);
  });

  it("uses config defaults for web search when per-call omitted", () => {
    const input: QueryInput = { query: "q" };
    const req = buildOpenAIRequest(input, cfg({ webSearchDefaultEnabled: true, webSearchContextSize: "low" }));
    expect(req.tools).toEqual([
      { type: "web_search_preview", search_context_size: "low" },
    ]);
  });

  it("overrides model/system/max_output_tokens/tool options", () => {
    const input: QueryInput = {
      query: "q",
      model: "gpt-5.1",
      system: "You are terse.",
      max_output_tokens: 1024,
      tool_choice: "none",
      parallel_tool_calls: false,
      verbosity: "high",
    };
    const req = buildOpenAIRequest(input, cfg());
    expect(req.model).toBe("gpt-5.1");
    expect(req.instructions).toBe("You are terse.");
    expect(req.max_output_tokens).toBe(1024);
    expect(req.tool_choice).toBe("none");
    expect(req.parallel_tool_calls).toBe(false);
    expect(req.text).toEqual({ verbosity: "high" as Verbosity });
  });
});
