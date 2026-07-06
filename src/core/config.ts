import { z } from "zod"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { paths, ensureHome } from "../util/paths"

export const ConfigSchema = z.object({
  baseUrl: z.string().url().default("https://api.plugsky.com/v1"),
  defaultModel: z.string().default("auto"),
  approvalMode: z.enum(["suggest", "auto-edit", "full-auto"]).default("suggest"),
  maxTurns: z.number().int().positive().default(25),
  temperature: z.number().min(0).max(2).default(0.2),
  theme: z.enum(["dark", "light", "mono"]).default("dark"),
  showUsage: z.boolean().default(true),
  telemetry: z.boolean().default(false),
  mcpServers: z
    .record(
      z.string(),
      z.object({
        command: z.string().optional(),
        args: z.array(z.string()).default([]),
        url: z.string().url().optional(),
        env: z.record(z.string(), z.string()).default({}),
      }),
    )
    .default({}),
  allowedTools: z.array(z.string()).default([]),
})

export type Config = z.infer<typeof ConfigSchema>

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  try { return JSON.parse(readFileSync(path, "utf8")) } catch { return {} }
}

export function loadConfig(cwd = process.cwd()): Config {
  ensureHome()
  const global = readJson(paths.config)
  const projPath = existsSync(join(cwd, ".plugsky", "config.json"))
    ? join(cwd, ".plugsky", "config.json")
    : join(cwd, "plugsky.json")
  const project = readJson(projPath)

  const envOverrides: Record<string, unknown> = {}
  if (process.env.PLUGSKY_BASE_URL) envOverrides.baseUrl = process.env.PLUGSKY_BASE_URL
  if (process.env.PLUGSKY_MODEL) envOverrides.defaultModel = process.env.PLUGSKY_MODEL

  return ConfigSchema.parse({ ...global, ...project, ...envOverrides })
}

export function saveGlobalConfig(patch: Partial<Config>): Config {
  ensureHome()
  const merged = ConfigSchema.parse({ ...readJson(paths.config), ...patch })
  writeFileSync(paths.config, JSON.stringify(merged, null, 2), { mode: 0o600 })
  return merged
}
