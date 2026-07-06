import pc from "picocolors"
import { buildContext } from "../context"
import { LADDER } from "../core/models"

export async function modelsCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  console.log(pc.bold("\nPlugsky model ladder"))
  for (const m of LADDER) console.log(`  ${pc.green(m.id.padEnd(18))} ${pc.dim(m.goodFor)}`)
  console.log(`  ${pc.cyan("auto".padEnd(18))} ${pc.dim("smart routing — picks the right tier per request")}\n`)
  const remote = await ctx.client.listModels()
  console.log(pc.bold("All available models:"))
  for (const m of remote) console.log("  " + m.id)
}
