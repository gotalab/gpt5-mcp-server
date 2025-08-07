#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";
import { config, ReasoningEffort, SearchContextSize, Verbosity } from "./config.js";

// Initialize MCP server
const server = new McpServer({ name: "gpt5-mcp", version: "0.1.0" });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.apiKey,
  maxRetries: config.maxRetries,
  timeout: config.timeoutMs,
});

// Input schema for the gpt5.query tool
const QueryInputSchema = z.object({
  query: z.string().describe("User question or instruction"),
  // Per-call overrides
  model: z.string().optional().describe("Model name, e.g. gpt-5"),
  system: z.string().optional().describe("Optional system prompt/instructions for the model"),
  reasoning_effort: z.enum(["low", "minimal", "medium", "high"]).optional(),
  verbosity: z.enum(["low", "medium", "high"]).optional(),
  tool_choice: z.enum(["auto", "none"]).optional(),
  parallel_tool_calls: z.boolean().optional(),
  max_output_tokens: z.number().int().positive().optional(),
  web_search: z
    .object({
      enabled: z.boolean().optional(),
      search_context_size: z.enum(["low", "medium", "high"]).optional(),
    })
    .optional(),
});

server.tool(
  "gpt5_query",
  "Query GPT-5 with optional Web Search Preview. Supports verbosity and reasoning effort.",
  { input: QueryInputSchema },
  async ({ input }) => {
    const parsed = QueryInputSchema.parse(input);

    const model = parsed.model ?? config.model;
    const effRaw = (parsed.reasoning_effort ?? config.reasoningEffort) as
      | "low"
      | ReasoningEffort
      | undefined;
    let reasoningEffort: ReasoningEffort | undefined = effRaw
      ? ((effRaw === "low" ? "minimal" : effRaw) as ReasoningEffort)
      : undefined;
    // OpenAI constraint: web_search cannot be used with reasoning.effort 'minimal'
    if (reasoningEffort === "minimal" && (parsed.web_search?.enabled ?? config.webSearchDefaultEnabled)) {
      reasoningEffort = "medium";
    }
    const verbosity: Verbosity | undefined = parsed.verbosity ?? config.defaultVerbosity;

    // Web search settings
    const webEnabled = parsed.web_search?.enabled ?? config.webSearchDefaultEnabled;
    const searchContextSize: SearchContextSize | undefined =
      parsed.web_search?.search_context_size ?? config.webSearchContextSize;

    const toolChoice = parsed.tool_choice ?? "auto"; // or "none"
    const parallelToolCalls = parsed.parallel_tool_calls ?? true;

    // Build tools array conditionally
    const tools: any[] = [];
    if (webEnabled) {
      const webTool: any = { type: "web_search_preview" };
      if (searchContextSize) {
        webTool.search_context_size = searchContextSize;
      }
      tools.push(webTool);
    }

    try {
      const response = await openai.responses.create({
        model,
        input: parsed.query,
        ...(parsed.system ? { instructions: parsed.system } : {}),
        ...(tools.length > 0 ? { tools } : {}),
        tool_choice: toolChoice,
        parallel_tool_calls: parallelToolCalls,
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        ...(verbosity ? { text: { verbosity } } : {}),
        ...(parsed.max_output_tokens ? { max_output_tokens: parsed.max_output_tokens } : {}),
      } as any);

      const text = (response as any).output_text ?? "";

      return {
        content: [
          { type: "text" as const, text: text || "No response text available." },
        ],
      };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          { type: "text" as const, text: `Error: ${message}` },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  if (!config.apiKey) {
    console.error("OPENAI_API_KEY is not set. Please set it in your environment or .env file.");
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
