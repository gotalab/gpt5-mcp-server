import { describe, it, expect, vi } from "vitest";
import { runQuery, buildOpenAIRequest, type QueryInput } from "../src/openai.ts";
import type { AppConfig } from "../src/config.ts";

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

describe("runQuery", () => {
  it("calls OpenAI.responses.create with built request and returns output_text", async () => {
    const input: QueryInput = {
      query: "hello",
      model: "gpt-5.1",
      reasoning_effort: "low",
      web_search: { enabled: true, search_context_size: "high" },
      verbosity: "high",
      tool_choice: "none",
      parallel_tool_calls: false,
      max_output_tokens: 256,
      system: "You are terse",
    };

    const expectedReq = buildOpenAIRequest(input, cfg());

    const fakeOpenAI = {
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: "OK" }),
      },
    } as any;

    const text = await runQuery(fakeOpenAI, input, cfg());

    expect(fakeOpenAI.responses.create).toHaveBeenCalledTimes(1);
    expect(fakeOpenAI.responses.create).toHaveBeenCalledWith(expectedReq);
    expect(text).toBe("OK");
  });

  it("returns fallback message when output_text missing", async () => {
    const fakeOpenAI = { responses: { create: vi.fn().mockResolvedValue({}) } } as any;
    const text = await runQuery(fakeOpenAI, { query: "q" }, cfg());
    expect(text).toBe("No response text available.");
  });
});
