import pc from "picocolors"
import { buildContext } from "../context"

export async function usageCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  const start = flagVal(argv, "--start"); const end = flagVal(argv, "--end")
  const res = await ctx.client.usage({ start_date: start, end_date: end, group_by: "model" })
  console.log(pc.bold("\nUsage"))
  for (const row of res.data ?? []) console.log("  " + JSON.stringify(row))
}
function flagVal(a: string[], n: string) { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined }
