import type { z } from "zod"

export interface ToolContext {
  cwd: string
  approvalMode: "suggest" | "auto-edit" | "full-auto"
  requestApproval: (summary: string, detail?: string) => Promise<boolean>
}

export interface Tool<TArgs = unknown> {
  name: string
  description: string
  schema: z.ZodType<TArgs>
  jsonSchema: Record<string, unknown>
  mutating: boolean
  run: (args: TArgs, ctx: ToolContext) => Promise<string>
}
