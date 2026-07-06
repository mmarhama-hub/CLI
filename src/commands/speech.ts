import { writeFileSync } from "node:fs"
import { buildContext } from "../context"
export async function speechCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  const out = flagVal(argv, "-o") ?? "plugsky-speech.mp3"
  const text = argv.filter((a) => !a.startsWith("-")).join(" ")
  const buf = await ctx.client.speech({ input: text })
  writeFileSync(out, Buffer.from(buf)); console.log(`✓ saved ${out}`)
}
function flagVal(a: string[], n: string) { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined }
