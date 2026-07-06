import type { Tool } from "./types"
import type { ToolSchema } from "../core/client"
import { readFileTool, writeFileTool, editFileTool, globTool, grepTool } from "./fs"
import { bashTool } from "./bash"

export class ToolRegistry {
  private tools = new Map<string, Tool<any>>()
  constructor(initial: Tool<any>[] = []) { for (const t of initial) this.register(t) }
  register(tool: Tool<any>): void { this.tools.set(tool.name, tool) }
  get(name: string): Tool<any> | undefined { return this.tools.get(name) }
  list(): Tool<any>[] { return [...this.tools.values()] }

  filtered(allow: string[]): Tool<any>[] {
    if (allow.length === 0) return this.list()
    return this.list().filter((t) => allow.includes(t.name))
  }

  toSchemas(allow: string[] = []): ToolSchema[] {
    return this.filtered(allow).map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.jsonSchema },
    }))
  }
}

export function defaultRegistry(): ToolRegistry {
  return new ToolRegistry([readFileTool, writeFileTool, editFileTool, globTool, grepTool, bashTool])
}
