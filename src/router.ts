import pc from "picocolors"
import { hasApiKey } from "./core/auth"
import { loginCommand } from "./commands/login"
import { runCommand } from "./commands/run"
import { chatCommand } from "./commands/chat"
import { configCommand } from "./commands/config"
import { modelsCommand } from "./commands/models"
import { usageCommand } from "./commands/usage"
import { imageCommand } from "./commands/image"
import { speechCommand } from "./commands/speech"
import { transcribeCommand } from "./commands/transcribe"
import { moderateCommand } from "./commands/moderate"
import { mcpCommand } from "./commands/mcp"
import { indexCommand } from "./commands/index_cmd"
import { updateCommand } from "./commands/update"
import { startTui } from "./tui/App"

const VERSION = "0.2.0"

const HELP = `${pc.bold("plugsky")} — premium agentic AI coding CLI

${pc.bold("Usage")}
  plugsky                     Start interactive session (TUI)
  plugsky "<task>"            One-shot agentic task in the current repo
  plugsky chat "<msg>"        Single streaming chat reply (no tools)

${pc.bold("Commands")}
  login            Authenticate with your Plugsky API key
  run <task>       Run an agentic task (alias for bare prompt)
  models           List available models & the Plugsky ladder
  usage            Show token usage & cost
  image <prompt>   Generate an image
  speech <text>    Text-to-speech to an audio file
  transcribe <f>   Transcribe an audio file
  moderate <text>  Run a moderation check
  mcp <sub>        Manage MCP servers (list/add/test)
  index            Build/refresh the codebase RAG index
  config <sub>     Get/set configuration
  update           Update plugsky to the latest version

${pc.bold("Flags")}
  -m, --model <id>     Override model (auto|plugsky-micro|...|plugsky-frontier)
  -y, --yes            full-auto approval (dangerous)
      --auto-edit      Auto-apply edits, prompt only for shell
      --cwd <dir>      Working directory
  -h, --help           Show help
  -v, --version        Show version
`

export async function runRouter(argv: string[]): Promise<void> {
  if (argv.includes("-v") || argv.includes("--version")) { console.log(VERSION); return }
  if (argv.length === 0) {
    if (!hasApiKey()) { console.log(pc.yellow("Welcome! Run `plugsky login` to get started.")); return }
    await startTui(); return
  }
  if (argv.includes("-h") || argv.includes("--help")) { console.log(HELP); return }

  const [cmd, ...rest] = argv
  switch (cmd) {
    case "login": return loginCommand(rest)
    case "run": return runCommand(rest)
    case "chat": return chatCommand(rest)
    case "models": return modelsCommand(rest)
    case "usage": return usageCommand(rest)
    case "image": return imageCommand(rest)
    case "speech": return speechCommand(rest)
    case "transcribe": return transcribeCommand(rest)
    case "moderate": return moderateCommand(rest)
    case "mcp": return mcpCommand(rest)
    case "index": return indexCommand(rest)
    case "config": return configCommand(rest)
    case "update": return updateCommand(rest)
    default:
      return runCommand(argv)
  }
}
