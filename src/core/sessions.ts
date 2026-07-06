import { Database } from "bun:sqlite"
import { randomUUID } from "node:crypto"
import { paths, ensureHome } from "../util/paths"
import type { ChatMessage } from "./client"

export interface SessionRow { id: string; title: string; cwd: string; created_at: string; updated_at: string }

let db: Database | null = null
function getDb(): Database {
  if (db) return db
  ensureHome()
  db = new Database(paths.sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cwd TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT,
      tool_calls TEXT,
      tool_call_id TEXT,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  `)
  return db
}

export function createSession(title: string, cwd = process.cwd()): string {
  const id = randomUUID()
  getDb().query("INSERT INTO sessions (id, title, cwd) VALUES (?, ?, ?)").run(id, title, cwd)
  return id
}

export function appendMessage(sessionId: string, m: ChatMessage): void {
  getDb()
    .query("INSERT INTO messages (session_id, role, content, tool_calls, tool_call_id, name) VALUES (?, ?, ?, ?, ?, ?)")
    .run(sessionId, m.role, m.content ?? null, m.tool_calls ? JSON.stringify(m.tool_calls) : null, m.tool_call_id ?? null, m.name ?? null)
  getDb().query("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId)
}

export function loadMessages(sessionId: string): ChatMessage[] {
  const rows = getDb()
    .query("SELECT role, content, tool_calls, tool_call_id, name FROM messages WHERE session_id = ? ORDER BY id ASC")
    .all(sessionId) as Array<Record<string, string | null>>
  return rows.map((r) => ({
    role: r.role as ChatMessage["role"],
    content: r.content as string | null,
    tool_calls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
    tool_call_id: r.tool_call_id ?? undefined,
    name: r.name ?? undefined,
  }))
}

export function listSessions(limit = 20): SessionRow[] {
  return getDb().query("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?").all(limit) as SessionRow[]
}

export function latestSession(cwd = process.cwd()): SessionRow | null {
  return (getDb().query("SELECT * FROM sessions WHERE cwd = ? ORDER BY updated_at DESC LIMIT 1").get(cwd) as SessionRow) ?? null
}

export function deleteSession(id: string): void {
  getDb().query("DELETE FROM sessions WHERE id = ?").run(id)
}
