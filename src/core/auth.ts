import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs"
import { paths, ensureHome } from "../util/paths"
import { AuthError } from "./errors"

interface AuthFile { apiKey: string; savedAt: string }

export function getApiKey(): string {
  if (process.env.PLUGSKY_API_KEY) return process.env.PLUGSKY_API_KEY
  if (!existsSync(paths.auth)) throw new AuthError()
  try {
    const a = JSON.parse(readFileSync(paths.auth, "utf8")) as AuthFile
    if (!a.apiKey) throw new AuthError()
    return a.apiKey
  } catch {
    throw new AuthError()
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.PLUGSKY_API_KEY) || existsSync(paths.auth)
}

export function saveApiKey(apiKey: string): void {
  ensureHome()
  const data: AuthFile = { apiKey, savedAt: new Date().toISOString() }
  writeFileSync(paths.auth, JSON.stringify(data, null, 2), { mode: 0o600 })
  chmodSync(paths.auth, 0o600)
}

export function logout(): void {
  if (existsSync(paths.auth)) writeFileSync(paths.auth, JSON.stringify({}), { mode: 0o600 })
}
