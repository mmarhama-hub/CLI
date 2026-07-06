import { buildContext } from "../context"
import type { ChatMessage } from "../core/client"
import { resolveModel } from "../util/model"

export async function chatCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  const rawModel = flagVal(argv, "-m") ?? flagVal(argv, "--model") ?? ctx.config.defaultModel
  const prompt = argv.filter((a) => !a.startsWith("-")).join(" ").trim()
  const piped = process.stdin.isTTY ? "" : await Bun.stdin.text()
  const content = [piped, prompt].filter(Boolean).join("\n\n")
  const messages: ChatMessage[] = [{ role: "user", content }]
  const model = await resolveModel(ctx.client, rawModel, messages)
  for await (const e of ctx.client.chatStream({ model, messages, temperature: ctx.config.temperature })) {
    if (e.type === "text") process.stdout.write(e.delta)
  }
  process.stdout.write("\n")
}
function flagVal(a: string[], n: string) { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined }
