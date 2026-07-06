import { loadConfig, type Config } from "./core/config"
import { getApiKey } from "./core/auth"
import { PlugskyClient } from "./core/client"

export interface Ctx { config: Config; client: PlugskyClient; cwd: string }

export function buildContext(cwd = process.cwd()): Ctx {
  const config = loadConfig(cwd)
  const client = new PlugskyClient({ apiKey: getApiKey(), baseUrl: config.baseUrl })
  return { config, client, cwd }
}
