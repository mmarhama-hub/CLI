import { z } from "zod"
import type { Tool } from "./types"

const DENY = [/\brm\s+-rf\s+\/(?!\w)/, /\bmkfs\b/, /:\(\)\s*\{/, /\bdd\s+if=/, />\s*\/dev\/sd/]
const isWin = process.platform === "win32"

export const bashTool: Tool<{ command: string; timeout_ms?: number }> = {
  name: "bash",
  description: isWin ? "Run a shell command via cmd.exe" : "Run a shell command via bash.",
  mutating: true,
  schema: z.object({ command: z.string(), timeout_ms: z.number().optional() }),
  jsonSchema: { type: "object", properties: { command: { type: "string" }, timeout_ms: { type: "number" } }, required: ["command"] },
  async run({ command, timeout_ms = 120_000 }, ctx) {
    if (DENY.some((re) => re.test(command))) return `BLOCKED: command matches a destructive pattern: ${command}`
    if (ctx.approvalMode !== "full-auto") {
      const ok = await ctx.requestApproval(`Run: ${command}`)
      if (!ok) return "SKIPPED: user declined the command."
    }
    const shell = isWin ? ["cmd.exe", "/c", command] : ["bash", "-lc", command]
    const proc = Bun.spawn(shell, { cwd: ctx.cwd, stdout: "pipe", stderr: "pipe" })
    const timer = setTimeout(() => proc.kill(), timeout_ms)
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
    const code = await proc.exited
    clearTimeout(timer)
    const tail = (s: string) => (s.length > 10_000 ? s.slice(-10_000) : s)
    return `exit=${code}\n--- stdout ---\n${tail(out)}\n--- stderr ---\n${tail(err)}`
  },
}
