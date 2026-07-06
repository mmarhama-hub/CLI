import pc from "picocolors"
import { buildContext } from "../context"
export async function moderateCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  const input = argv.join(" ")
  const res = await ctx.client.moderate(input)
  const r = res.results?.[0]
  console.log(r?.flagged ? pc.red("FLAGGED") : pc.green("clean"), JSON.stringify(r?.categories ?? {}))
}
