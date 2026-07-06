import { writeFileSync } from "node:fs"
import { buildContext } from "../context"
export async function imageCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  const out = flagVal(argv, "-o") ?? "plugsky-image.png"
  const prompt = argv.filter((a) => !a.startsWith("-")).join(" ")
  const res = await ctx.client.generateImage({ prompt })
  const b64 = res.data?.[0]?.b64_json
  if (b64) { writeFileSync(out, Buffer.from(b64, "base64")); console.log(`✓ saved ${out}`) }
  else console.log(res.data?.[0]?.url ?? "(no image returned)")
}
function flagVal(a: string[], n: string) { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined }
