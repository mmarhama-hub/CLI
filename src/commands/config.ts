import { loadConfig, saveGlobalConfig, type Config } from "../core/config"
export async function configCommand(argv: string[]): Promise<void> {
  const [sub, key, ...valueParts] = argv
  if (sub === "get" || !sub) { console.log(JSON.stringify(loadConfig(), null, 2)); return }
  if (sub === "set" && key) {
    const value = valueParts.join(" ")
    const parsed = /^(true|false|\d+(\.\d+)?)$/.test(value) ? JSON.parse(value) : value
    const next = saveGlobalConfig({ [key]: parsed } as unknown as Partial<Config>)
    console.log(`✓ ${key} = ${JSON.stringify((next as Record<string, unknown>)[key])}`)
  }
}
