import pc from "picocolors"
import { buildContext } from "../context"
import { Orchestrator } from "../agent/orchestrator"
import { buildSystemPrompt } from "../agent/prompt"
import { defaultRegistry } from "../tools/registry"
import { createSession, appendMessage, latestSession, loadMessages } from "../core/sessions"
import type { ChatMessage } from "../core/client"
import type { ToolContext } from "../tools/types"
import { confirmTTY } from "../util/spinner"
import { retrieveContext } from "../rag/indexer"
import { resolveModel } from "../util/model"

export async function runCommand(argv: string[]): Promise<void> {
  const cwd = flagVal(argv, "--cwd") ?? process.cwd()
  const ctx = buildContext(cwd)
  const rawModel = flagVal(argv, "-m") ?? flagVal(argv, "--model") ?? ctx.config.defaultModel
  const approvalMode = argv.includes("-y") || argv.includes("--yes")
    ? "full-auto" : argv.includes("--auto-edit") ? "auto-edit" : ctx.config.approvalMode
  const task = argv.filter((a) => !a.startsWith("-")).join(" ").trim()
  if (!task) { console.error("Provide a task, e.g. plugsky \"add tests for utils\""); process.exit(1) }

  const resume = argv.includes("--resume") ? latestSession(cwd) : null
  const sessionId = resume?.id ?? createSession(task.slice(0, 60), cwd)

  const systemContent = buildSystemPrompt(cwd)
  const ragContext = await retrieveContext(ctx.client as never, cwd, task).catch(() => "")
  const enhancedSystem = ragContext
    ? `${systemContent}\n\nRelevant code context:\n${ragContext}`
    : systemContent

  const baseHistory: ChatMessage[] = resume ? loadMessages(sessionId) : []
  const hasSystem = baseHistory.length > 0 && baseHistory[0]?.role === "system"
  const history: ChatMessage[] = hasSystem ? baseHistory : [{ role: "system", content: enhancedSystem }, ...baseHistory]

  const model = await resolveModel(ctx.client, rawModel, [...history, { role: "user", content: task }])
  const userMsg: ChatMessage = { role: "user", content: task }
  appendMessage(sessionId, userMsg)

  const toolCtx: ToolContext = {
    cwd, approvalMode,
    requestApproval: async (summary, detail) => {
      if (detail) process.stdout.write(pc.dim(detail) + "\n")
      return confirmTTY(pc.yellow(`? ${summary} — approve? [y/N] `))
    },
  }

  const orch = new Orchestrator(ctx.client, defaultRegistry(), ctx.config.allowedTools)
  process.stdout.write(pc.dim(`▸ model: ${model} · mode: ${approvalMode}\n\n`))

  const { finalText, messages } = await orch.run(
    { model, messages: [...history, userMsg], maxTurns: ctx.config.maxTurns, temperature: ctx.config.temperature, toolCtx },
    {
      onText: (d) => process.stdout.write(d),
      onToolStart: (c) => process.stdout.write(pc.cyan(`\n⚙ ${c.function.name}(${truncate(c.function.arguments)})\n`)),
      onToolResult: (n, r) => process.stdout.write(pc.dim(`← ${n}: ${truncate(r, 160)}\n`)),
      onUsage: (u) => ctx.config.showUsage && process.stdout.write(pc.dim(`\n[tokens: ${u.total_tokens}]\n`)),
    },
  )

  for (const m of messages.slice(history.length + 1)) appendMessage(sessionId, m)
  if (finalText) process.stdout.write("\n")
}

function flagVal(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined
}
function truncate(s: string, n = 80): string { return s.length > n ? s.slice(0, n) + "…" : s }
