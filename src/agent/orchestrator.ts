import type { PlugskyClient, ChatMessage, ToolCall, Usage } from "../core/client"
import type { ToolRegistry } from "../tools/registry"
import type { ToolContext } from "../tools/types"

export interface AgentEvents {
  onText?: (delta: string) => void
  onToolStart?: (call: ToolCall) => void
  onToolResult?: (name: string, result: string) => void
  onUsage?: (usage: Usage) => void
  onTurn?: (n: number) => void
}

export interface AgentRunOptions {
  model: string
  messages: ChatMessage[]
  maxTurns: number
  temperature: number
  toolCtx: ToolContext
  signal?: AbortSignal
}

export class Orchestrator {
  constructor(private client: PlugskyClient, private registry: ToolRegistry, private allowTools: string[] = []) {}

  async run(opts: AgentRunOptions, ev: AgentEvents = {}): Promise<{ finalText: string; messages: ChatMessage[] }> {
    const messages = [...opts.messages]
    const tools = this.registry.toSchemas(this.allowTools)
    let finalText = ""

    for (let turn = 0; turn < opts.maxTurns; turn++) {
      ev.onTurn?.(turn + 1)
      let assistantText = ""
      const pendingCalls: ToolCall[] = []

      for await (const e of this.client.chatStream({
        model: opts.model,
        messages,
        tools: tools.length ? tools : undefined,
        temperature: opts.temperature,
        signal: opts.signal,
      })) {
        if (e.type === "text") { assistantText += e.delta; ev.onText?.(e.delta) }
        else if (e.type === "tool_call") pendingCalls.push(e.call)
        else if (e.type === "usage") ev.onUsage?.(e.usage)
      }

      messages.push({ role: "assistant", content: assistantText || null, tool_calls: pendingCalls.length ? pendingCalls : undefined })

      if (pendingCalls.length === 0) { finalText = assistantText; break }

      for (const call of pendingCalls) {
        ev.onToolStart?.(call)
        const tool = this.registry.get(call.function.name)
        let result: string
        if (!tool) {
          result = `ERROR: unknown tool ${call.function.name}`
        } else {
          try {
            const rawArgs = call.function.arguments ? JSON.parse(call.function.arguments) : {}
            const args = tool.schema.parse(rawArgs)
            result = await tool.run(args, opts.toolCtx)
          } catch (err) {
            result = `ERROR: ${err instanceof Error ? err.message : String(err)}`
          }
        }
        ev.onToolResult?.(call.function.name, result)
        messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result })
      }
    }

    return { finalText, messages }
  }
}
