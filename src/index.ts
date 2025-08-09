#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";
import { config } from "./config.js";
import { runQuery } from "./openai.js";
import type { QueryInput } from "./openai.js";

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
    try {
      const text = await runQuery(openai, parsed as QueryInput, config);
      return {
        content: [{ type: "text" as const, text: text || "No response text available." }],
      };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
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
