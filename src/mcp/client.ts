import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { z } from "zod"
import type { Tool } from "../tools/types"
import type { Config } from "../core/config"

export interface McpConnection { name: string; client: Client; tools: Tool[] }

export async function connectMcpServers(config: Config): Promise<McpConnection[]> {
  const out: McpConnection[] = []
  for (const [name, cfg] of Object.entries(config.mcpServers)) {
    const client = new Client({ name: "plugsky-cli", version: "0.2.0" }, { capabilities: {} })
    const transport = cfg.url
      ? new StreamableHTTPClientTransport(new URL(cfg.url))
      : new StdioClientTransport({ command: cfg.command!, args: cfg.args, env: { ...process.env, ...cfg.env } as Record<string, string> })
    await client.connect(transport)
    const { tools } = await client.listTools()
    const wrapped: Tool[] = tools.map((t) => ({
      name: `mcp__${name}__${t.name}`,
      description: t.description ?? `MCP tool ${t.name} from ${name}`,
      mutating: true,
      schema: z.record(z.string(), z.unknown()),
      jsonSchema: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
      run: async (args) => {
        const res = await client.callTool({ name: t.name, arguments: args as Record<string, unknown> })
        const content = (res.content as Array<{ type: string; text?: string }>) ?? []
        return content.map((c) => (c.type === "text" ? c.text : `[${c.type}]`)).join("\n")
      },
    }))
    out.push({ name, client, tools: wrapped })
  }
  return out
}
