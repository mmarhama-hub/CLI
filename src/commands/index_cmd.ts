import pc from "picocolors"
import { buildContext } from "../context"
import { buildIndex } from "../rag/indexer"

export async function indexCommand(_argv?: string[]): Promise<void> {
  const ctx = buildContext()
  process.stdout.write("Indexing codebase… ")
  const n = await buildIndex(ctx.client as never, ctx.cwd)
  console.log(pc.green(`✓ indexed ${n} chunks.`))
}
