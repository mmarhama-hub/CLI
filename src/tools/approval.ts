import type { ToolContext } from "./types"

export async function gate(ctx: ToolContext, mutating: boolean, summary: string, detail?: string): Promise<boolean> {
  if (!mutating) return true
  if (ctx.approvalMode === "full-auto") return true
  if (ctx.approvalMode === "auto-edit") return true
  return ctx.requestApproval(summary, detail)
}
