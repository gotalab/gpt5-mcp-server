# GPT-5 MCP Server (TypeScript)

An MCP server that exposes a `gpt5_query` tool for GPT-5 inference via OpenAI Responses API, with optional Web Search Preview. Supports per-call overrides for verbosity, reasoning effort, and other parameters.

[日本語はこちら](#ja)

## Features
- TypeScript MCP server using `@modelcontextprotocol/sdk`
- `gpt5_query` tool
  - `web_search_preview` integration (optional)
  - `verbosity` (low|medium|high)
  - `reasoning.effort` (low|medium|high)
  - `tool_choice` (auto|none), `parallel_tool_calls`
  - `system` prompt, `model`, `max_output_tokens`
- Config via environment variables with per-call overrides

## Quick Start

1) Install dependencies

```bash
pnpm i # or npm i / yarn
```

2) Configure environment

Create `.env` (or export env vars):

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT_MS=60000
REASONING_EFFORT=medium
DEFAULT_VERBOSITY=medium
WEB_SEARCH_DEFAULT_ENABLED=false
WEB_SEARCH_CONTEXT_SIZE=medium
```

3) Build and run

```bash
pnpm run build
pnpm start
```

For development (watch mode):

```bash
pnpm run dev
```

## Using with MCP Clients (Claude Code, Claude Desktop)

This server speaks Model Context Protocol (MCP) over stdio and emits pure JSON to stdout, making it safe for Claude Code and Claude Desktop.

Prerequisites
- Node.js 18+
- OpenAI API key via `.env` or environment variable

0) Build
```bash
pnpm run build
```

1) Run directly (recommended)
- Command: `node`
- Args: `dist/cli.js`
- CWD: repository root (required if you want `.env` to be loaded)

Example:
```bash
node dist/cli.js
```

2) Add to Claude Code (VS Code)
- Command Palette → "Claude: Manage MCP Servers"
- "Add server" with:
  - Name: `gpt5-mcp`
  - Command: `node` (or absolute path, e.g., `/opt/homebrew/bin/node`)
  - Args: ["/absolute/path/to/gpt5-mcp-server/dist/cli.js"] (or just `gpt5-mcp-server` if installed globally)
  - Env (choose one):
    - Option A (ENV_FILE): `ENV_FILE=/absolute/path/to/gpt5-mcp-server/.env`
    - Option B (explicit): set `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `DEFAULT_VERBOSITY`, `REASONING_EFFORT`, `WEB_SEARCH_DEFAULT_ENABLED`, `WEB_SEARCH_CONTEXT_SIZE`

3) Add to Claude Desktop
Edit config (e.g., macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`) and add:

Option A: using ENV_FILE

```json
{
  "mcpServers": {
    "gpt5-mcp": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/absolute/path/to/gpt5-mcp-server/dist/cli.js"],
      "env": {
        "ENV_FILE": "/absolute/path/to/gpt5-mcp-server/.env"
      }
    }
  }
}
```

Option B: explicit env vars

```json
{
  "mcpServers": {
    "gpt5-mcp": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/absolute/path/to/gpt5-mcp-server/dist/cli.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "OPENAI_MODEL": "gpt-5",
        "OPENAI_TIMEOUT_MS": "120000",
        "DEFAULT_VERBOSITY": "medium",
        "REASONING_EFFORT": "low",
        "WEB_SEARCH_DEFAULT_ENABLED": "false",
        "WEB_SEARCH_CONTEXT_SIZE": "medium"
      }
    }
  }
}
```

4) CLI usage
- Package exposes bin(s).
  - Local link: `npm link` → run `gpt5-mcp-server`
  - Global (after publish): `npm i -g gpt5-mcp-server` → `gpt5-mcp-server`
  - Direct: `node /absolute/path/to/gpt5-mcp-server/dist/cli.js`

5) Web Search notes
- Due to OpenAI constraints, `web_search_preview` cannot be combined with `reasoning.effort = minimal`.
- This server automatically bumps effort to `medium` if `web_search.enabled = true`.
- If you need strict `minimal`, set `web_search.enabled = false`.

7) Troubleshooting
- JSON parse error (Unexpected token ...)
  - Likely extra logs on stdio. Use `node dist/cli.js`, avoid `npx`.
- Auth error
  - Ensure `OPENAI_API_KEY` is provided.
- Timeout
  - Increase `OPENAI_TIMEOUT_MS` (e.g., 120000).
- 400 with Web Search
  - Caused by `minimal` effort + web search. It's auto-bumped to `medium`; alternatively set `reasoning_effort=medium` or disable `web_search`.

## Tool: gpt5_query

Input schema (JSON):

```json
{
  "query": "string",
  "model": "string?",
  "system": "string?",
  "reasoning_effort": "low|minimal|medium|high?",
  "verbosity": "low|medium|high?",
  "tool_choice": "auto|none?",
  "parallel_tool_calls": "boolean?",
  "max_output_tokens": "number?",
  "web_search": {
    "enabled": "boolean?",
    "search_context_size": "low|medium|high?"
  }
}
```

Example call (Inspector or client):

```json
{
  "method": "tools/call",
  "params": {
    "name": "gpt5_query",
    "arguments": {
      "query": "Summarize the latest on X.",
      "verbosity": "low",
      "web_search": { "enabled": true, "search_context_size": "medium" }
    }
  }
}
```

Defaults and behavior
- model: defaults to `OPENAI_MODEL` (env). Example: `gpt-5`.
- system: optional. Sent as `instructions`.
- reasoning_effort: accepts `low|minimal|medium|high`. Internally `low` → `minimal`。
  - Constraint: when `web_search.enabled=true` and effort is `minimal`, it is auto-bumped to `medium` to satisfy OpenAI constraints.
- verbosity: defaults to `DEFAULT_VERBOSITY` (env). Sent as `text.verbosity`.
- tool_choice: default `auto`.
- parallel_tool_calls: default `true`.
- max_output_tokens: optional; omitted when not set.
- web_search.enabled: defaults to `WEB_SEARCH_DEFAULT_ENABLED` (env).
- web_search.search_context_size: defaults to `WEB_SEARCH_CONTEXT_SIZE` (env). Allowed: `low|medium|high`.

Environment variable mapping
- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` → model default
- `OPENAI_MAX_RETRIES` → OpenAI client
- `OPENAI_TIMEOUT_MS` → OpenAI client
- `REASONING_EFFORT` → reasoning_effort default (`low|minimal|medium|high`)
- `DEFAULT_VERBOSITY` → verbosity default (`low|medium|high`)
- `WEB_SEARCH_DEFAULT_ENABLED` → web_search.enabled default (`true|false`)
- `WEB_SEARCH_CONTEXT_SIZE` → web_search.search_context_size default (`low|medium|high`)

Output shape
- On success: `content: [{ type: "text", text: string }]`
- On error: `isError: true` and a `text` item with `Error: ...`

## Notes
- If the selected model does not support certain fields (e.g., `verbosity`), they are ignored.
- Keep API keys out of logs. Ensure `.env` is not committed.

## License
MIT

## 日本語 (Japanese)
<a id="ja"></a>

### ツール: gpt5_query

入力スキーマ (JSON):

```json
{
  "query": "string",
  "model": "string?",
  "system": "string?",
  "reasoning_effort": "low|minimal|medium|high?",
  "verbosity": "low|medium|high?",
  "tool_choice": "auto|none?",
  "parallel_tool_calls": "boolean?",
  "max_output_tokens": "number?",
  "web_search": {
    "enabled": "boolean?",
    "search_context_size": "low|medium|high?"
  }
}
```

例 (Inspector など):

```json
{
  "method": "tools/call",
  "params": {
    "name": "gpt5_query",
    "arguments": {
      "query": "Summarize the latest on X.",
      "verbosity": "low",
      "web_search": { "enabled": true, "search_context_size": "medium" }
    }
  }
}
```

既定値と挙動
- model: 既定は `OPENAI_MODEL`（環境変数）。例: `gpt-5`。
- system: 任意。OpenAI には `instructions` として送信します。
- reasoning_effort: `low|minimal|medium|high` を受け付け、内部的に `low` は `minimal` として扱われます。
  - 制約: `web_search.enabled=true` かつ effort=`minimal` の場合、OpenAI の制約に合わせて自動的に `medium` に引き上げます。
- verbosity: 既定は `DEFAULT_VERBOSITY`（環境変数）。OpenAI には `text.verbosity` として送信します。
- tool_choice: 既定は `auto`。
- parallel_tool_calls: 既定は `true`。
- max_output_tokens: 任意。未指定の場合は送信しません。
- web_search.enabled: 既定は `WEB_SEARCH_DEFAULT_ENABLED`（環境変数）。
- web_search.search_context_size: 既定は `WEB_SEARCH_CONTEXT_SIZE`（環境変数）。許容値: `low|medium|high`。

環境変数マッピング
- `OPENAI_API_KEY`（必須）
- `OPENAI_MODEL` → model 既定
- `OPENAI_MAX_RETRIES` → OpenAI クライアント設定
- `OPENAI_TIMEOUT_MS` → OpenAI クライアント設定
- `REASONING_EFFORT` → reasoning_effort 既定（`low|minimal|medium|high`）
- `DEFAULT_VERBOSITY` → verbosity 既定（`low|medium|high`）
- `WEB_SEARCH_DEFAULT_ENABLED` → web_search.enabled 既定（`true|false`）
- `WEB_SEARCH_CONTEXT_SIZE` → web_search.search_context_size 既定（`low|medium|high`）

出力形式
- 成功時: `content: [{ type: "text", text: string }]`
- エラー時: `isError: true` と `text` に `Error: ...`

注意
- 選択したモデルが特定のフィールド（例: `verbosity`）をサポートしない場合、それらは無視されます。
- API キーはログに出力しません。`.env` はコミットしないでください。

### MCP Serverの使い方

このサーバーは Model Context Protocol (MCP) の標準入出力（stdio）で動作します。純粋な JSON のみを stdout に出力する設計のため、MCP Inspector / Claude Code / Claude Desktop で安全に接続できます。

前提
- Node.js 18+
- OpenAI APIキーが `.env` もしくは環境変数で設定されていること

0) ビルド
```bash
pnpm run build
```

1) 直接起動（推奨）
- コマンド: `node`
- 引数: `dist/cli.js`
- CWD: リポジトリのルート（`.env` を読む場合は必須）

例:
```bash
node dist/cli.js
```

2) Claude Code（VS Code 拡張）に追加
- VS Code のコマンドパレット → 「Claude: Manage MCP Servers」
- 「Add server」で次を入力:
  - Name: `gpt5-mcp`
  - Command: `node`（絶対パス可）
  - Args: `["/絶対/パス/gpt5-mcp-server/dist/cli.js"]`（グローバル導入済みなら不要）
  - Env（どちらか一方）:
    - オプションA（ENV_FILE）: `ENV_FILE=/絶対/パス/gpt5-mcp-server/.env`
    - オプションB（明示指定）: `OPENAI_API_KEY`、`OPENAI_MODEL`、`OPENAI_TIMEOUT_MS`、`DEFAULT_VERBOSITY`、`REASONING_EFFORT`、`WEB_SEARCH_DEFAULT_ENABLED`、`WEB_SEARCH_CONTEXT_SIZE`

3) Claude Desktop に追加
設定ファイル（例: macOS は `~/Library/Application Support/Claude/claude_desktop_config.json`）を編集して以下を追記します。

オプションA: ENV_FILE を使う

```json
{
  "mcpServers": {
    "gpt5-mcp": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/絶対/パス/gpt5-mcp-server/dist/cli.js"],
      "env": {
        "ENV_FILE": "/絶対/パス/gpt5-mcp-server/.env"
      }
    }
  }
}
```

オプションB: 環境変数を明示指定

```json
{
  "mcpServers": {
    "gpt5-mcp": {
      "command": "/opt/homebrew/bin/node",
      "args": ["/絶対/パス/gpt5-mcp-server/dist/cli.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "OPENAI_MODEL": "gpt-5",
        "OPENAI_TIMEOUT_MS": "120000",
        "DEFAULT_VERBOSITY": "medium",
        "REASONING_EFFORT": "low",
        "WEB_SEARCH_DEFAULT_ENABLED": "false",
        "WEB_SEARCH_CONTEXT_SIZE": "medium"
      }
    }
  }
}
```

4) CLI の利用
- パッケージには bin が含まれます。
  - ローカルリンク: `npm link` 後に `gpt5-mcp-server`
  - グローバル（公開後）: `npm i -g gpt5-mcp-server` → `gpt5-mcp-server`
  - 直接実行: `node /絶対/パス/gpt5-mcp-server/dist/cli.js`

5) Web Search に関する注意
- OpenAI の制約により、`web_search_preview` は `reasoning.effort = minimal` と併用できません。
- 本サーバーは `web_search.enabled = true` の場合、自動的に effort を `medium` に引き上げて呼び出します。
- もし `minimal` を厳格に使いたい場合は、`web_search.enabled = false` にしてください。

6) トラブルシューティング
- JSON パースエラー（Unexpected token ...）
  - stdio に余計な出力が混ざっている可能性があります。`node dist/cli.js` を使い、`npx` は避けてください。
  - `.env` 読み込みやライブラリのログは既に抑止済みです。
- 認証エラー
  - `OPENAI_API_KEY` が正しく渡っているか確認。
- タイムアウト
  - `OPENAI_TIMEOUT_MS` を増やす（例: 120000）。
- Web Search で 400 エラー
  - `reasoning.effort=minimal` と `web_search` の併用不可が原因。自動的に `medium` に上げますが、明示的に `medium` を指定するか、`web_search` を無効化してください。
