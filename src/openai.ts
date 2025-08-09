import type OpenAI from "openai";
import type { ReasoningEffort, SearchContextSize, Verbosity, AppConfig } from "./config.js";

export type QueryInput = {
  query: string;
  model?: string;
  system?: string;
  reasoning_effort?: "low" | "minimal" | "medium" | "high";
  verbosity?: Verbosity;
  tool_choice?: "auto" | "none";
  parallel_tool_calls?: boolean;
  max_output_tokens?: number;
  web_search?: {
    enabled?: boolean;
    search_context_size?: SearchContextSize;
  };
};

type WebSearchPreviewTool = {
  type: "web_search_preview";
  search_context_size?: SearchContextSize;
};

export type OpenAIRequest = {
  model: string;
  input: string;
  instructions?: string;
  tools?: WebSearchPreviewTool[];
  tool_choice: "auto" | "none";
  parallel_tool_calls: boolean;
  reasoning?: { effort: ReasoningEffort };
  text?: { verbosity: Verbosity };
  max_output_tokens?: number;
};

export function buildOpenAIRequest(input: QueryInput, cfg: AppConfig): OpenAIRequest {
  const model = input.model ?? cfg.model;

  const effRaw = (input.reasoning_effort ?? cfg.reasoningEffort) as
    | "low"
    | ReasoningEffort
    | undefined;
  let reasoningEffort: ReasoningEffort | undefined = effRaw
    ? ((effRaw === "low" ? "minimal" : effRaw) as ReasoningEffort)
    : undefined;

  // Bump reasoning for web search minimal constraint
  const webEnabled = input.web_search?.enabled ?? cfg.webSearchDefaultEnabled;
  if (reasoningEffort === "minimal" && webEnabled) {
    reasoningEffort = "medium";
  }

  const verbosity: Verbosity | undefined = input.verbosity ?? cfg.defaultVerbosity;

  const searchContextSize: SearchContextSize | undefined =
    input.web_search?.search_context_size ?? cfg.webSearchContextSize;

  const toolChoice = input.tool_choice ?? "auto";
  const parallelToolCalls = input.parallel_tool_calls ?? true;

  const tools: WebSearchPreviewTool[] = [];
  if (webEnabled) {
    const webTool: WebSearchPreviewTool = { type: "web_search_preview" };
    if (searchContextSize) {
      webTool.search_context_size = searchContextSize;
    }
    tools.push(webTool);
  }

  const req: OpenAIRequest = {
    model,
    input: input.query,
    tool_choice: toolChoice,
    parallel_tool_calls: parallelToolCalls,
  } as OpenAIRequest;

  if (input.system) req.instructions = input.system;
  if (tools.length > 0) req.tools = tools;
  if (reasoningEffort) req.reasoning = { effort: reasoningEffort };
  if (verbosity) req.text = { verbosity };
  if (input.max_output_tokens) req.max_output_tokens = input.max_output_tokens;

  return req;
}

function extractOutputText(res: unknown): string | undefined {
  if (typeof res === "object" && res !== null && "output_text" in res) {
    const v = (res as { output_text?: unknown }).output_text;
    if (typeof v === "string") return v;
  }
  return undefined;
}

export async function runQuery(openai: OpenAI, input: QueryInput, cfg: AppConfig) {
  const req = buildOpenAIRequest(input, cfg);
  const response: unknown = await openai.responses.create(
    req as unknown as Record<string, unknown>
  );
  const text = extractOutputText(response) ?? "";
  return text || "No response text available.";
}
