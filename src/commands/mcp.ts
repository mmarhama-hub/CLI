import pc from "picocolors"
import { loadConfig, saveGlobalConfig } from "../core/config"
import { connectMcpServers } from "../mcp/client"

export async function mcpCommand(argv: string[]): Promise<void> {
  const [sub] = argv
  const config = loadConfig()
  if (sub === "list" || !sub) {
    const names = Object.keys(config.mcpServers)
    if (!names.length) { console.log("No MCP servers configured. Add one in ~/.plugsky/config.json under mcpServers."); return }
    for (const n of names) console.log(`  ${pc.green(n)}: ${JSON.stringify(config.mcpServers[n])}`)
    return
  }
  if (sub === "test") {
    const conns = await connectMcpServers(config)
    for (const c of conns) { console.log(pc.bold(c.name)); for (const t of c.tools) console.log("  • " + t.name) }
  }
}
