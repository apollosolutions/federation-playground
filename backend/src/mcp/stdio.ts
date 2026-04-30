/**
 * MCP server stdio entry point.
 * Run with: node dist/mcp/stdio.js
 * Or in dev:  tsx src/mcp/stdio.ts
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const server = createMcpServer();
const transport = new StdioServerTransport();

await server.connect(transport);
