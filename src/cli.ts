#!/usr/bin/env node
// Minimal CLI entry for MCP stdio server. Do not print anything to stdout/stderr.
// Use explicit .js extension for Node ESM resolution after compilation.
// @ts-ignore - TypeScript may not resolve the .js path in source; runtime will.
import("./index.js");
