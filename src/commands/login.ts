import pc from "picocolors"
import { saveApiKey } from "../core/auth"
import { loadConfig } from "../core/config"
import { PlugskyClient } from "../core/client"

export async function loginCommand(argv: string[]): Promise<void> {
  const cfg = loadConfig()
  const keyFlag = flag(argv, "--key")
  let apiKey = keyFlag ?? process.env.PLUGSKY_API_KEY ?? ""

  if (!apiKey) {
    apiKey = (await readPassword("Enter your Plugsky API key (sk-live-...): ")).trim()
  }
  if (!apiKey.startsWith("sk-")) {
    throw new Error("That doesn't look like a Plugsky key (expected sk-live-…).")
  }

  const client = new PlugskyClient({ apiKey, baseUrl: cfg.baseUrl })
  const models = await client.listModels()
  saveApiKey(apiKey)
  process.stdout.write(
    pc.green(`✓ Logged in. ${models.length} models available. Try: `) +
      pc.bold('plugsky "explain this repo"\n'),
  )
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

async function readPassword(prompt: string): Promise<string> {
  process.stdout.write(pc.bold(prompt))
  const prev = Bun.spawnSync(["stty", "-g"]).stdout.toString().trim()
  Bun.spawnSync(["stty", "-echo"])
  try {
    for await (const line of console) { process.stdout.write("\n"); return line }
    return ""
  } finally {
    Bun.spawnSync(["stty", prev ?? "sane"])
  }
}
