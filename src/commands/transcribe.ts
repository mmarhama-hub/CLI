import { buildContext } from "../context"
export async function transcribeCommand(argv: string[]): Promise<void> {
  const ctx = buildContext()
  const path = argv.find((a) => !a.startsWith("-"))
  if (!path) { console.error("Usage: plugsky transcribe <audio-file>"); process.exit(1) }
  const file = Bun.file(path)
  const text = await ctx.client.transcribe(await file.arrayBuffer() as unknown as Blob)
  console.log(text)
}
