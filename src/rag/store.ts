import { Database } from "bun:sqlite"
import { join } from "node:path"
import { paths } from "../util/paths"

export interface Chunk { id?: number; path: string; start: number; text: string; embedding: number[] }

function projectDbPath(cwd: string): string {
  const safe = cwd.replace(/[^a-zA-Z0-9]/g, "_")
  return join(paths.ragDir, `${safe}.db`)
}

export class RagStore {
  private db: Database
  constructor(cwd: string) {
    this.db = new Database(projectDbPath(cwd))
    this.db.exec(`CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, start INTEGER, text TEXT, embedding TEXT)`)
  }
  clear() { this.db.exec("DELETE FROM chunks") }
  insert(c: Chunk) {
    this.db.query("INSERT INTO chunks (path, start, text, embedding) VALUES (?, ?, ?, ?)")
      .run(c.path, c.start, c.text, JSON.stringify(c.embedding))
  }
  all(): Chunk[] {
    return (this.db.query("SELECT * FROM chunks").all() as Array<Record<string, string | number>>).map((r) => ({
      id: r.id as number, path: r.path as string, start: r.start as number, text: r.text as string,
      embedding: JSON.parse(r.embedding as string),
    }))
  }
  search(query: number[], k = 6): Chunk[] {
    return this.all()
      .map((c) => ({ c, score: cosine(query, c.embedding) }))
      .sort((a, b) => b.score - a.score).slice(0, k).map((x) => x.c)
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i]! * b[i]!; na += a[i]! ** 2; nb += b[i]! ** 2 }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8)
}
