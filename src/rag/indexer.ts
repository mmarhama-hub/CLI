import fg from "fast-glob"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { RagStore, type Chunk } from "./store"
import type { PlugskyClient } from "../core/client"

const CODE_GLOBS = ["**/*.{ts,tsx,js,jsx,py,go,rs,java,rb,php,md}"]
const IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]

function chunkText(text: string, size = 1600): Array<{ start: number; text: string }> {
  const out: Array<{ start: number; text: string }> = []
  for (let i = 0; i < text.length; i += size) out.push({ start: i, text: text.slice(i, i + size) })
  return out
}

export async function buildIndex(client: PlugskyClient & { embed(i: string[]): Promise<number[][]> }, cwd: string): Promise<number> {
  const store = new RagStore(cwd); store.clear()
  const files = await fg(CODE_GLOBS, { cwd, ignore: IGNORE })
  let count = 0
  for (const rel of files) {
    const text = readFileSync(join(cwd, rel), "utf8")
    const pieces = chunkText(text)
    for (let i = 0; i < pieces.length; i += 16) {
      const batch = pieces.slice(i, i + 16)
      const vecs = await client.embed(batch.map((b) => b.text))
      batch.forEach((b, j) => { store.insert({ path: rel, start: b.start, text: b.text, embedding: vecs[j]! } as Chunk); count++ })
    }
  }
  return count
}

export async function retrieveContext(client: PlugskyClient & { embed(i: string[]): Promise<number[][]> }, cwd: string, query: string): Promise<string> {
  const store = new RagStore(cwd)
  const [qvec] = await client.embed([query])
  const hits = store.search(qvec!, 6)
  return hits.map((h) => `// ${h.path} @${h.start}\n${h.text}`).join("\n\n---\n\n")
}
