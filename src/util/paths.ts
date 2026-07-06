import { homedir } from "node:os"
import { join } from "node:path"
import { mkdirSync } from "node:fs"

export const HOME = join(homedir(), ".plugsky")
export const paths = {
  home: HOME,
  config: join(HOME, "config.json"),
  auth: join(HOME, "auth.json"),
  sessions: join(HOME, "sessions.db"),
  ragDir: join(HOME, "rag"),
  logs: join(HOME, "logs"),
}

export function ensureHome(): void {
  mkdirSync(HOME, { recursive: true, mode: 0o700 })
  mkdirSync(paths.logs, { recursive: true })
  mkdirSync(paths.ragDir, { recursive: true })
}
