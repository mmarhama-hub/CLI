export interface SlashCommand { name: string; description: string }
export const SLASH: SlashCommand[] = [
  { name: "/model", description: "Switch model (e.g. /model plugsky-pro)" },
  { name: "/mode", description: "Set approval mode: suggest | auto-edit | full-auto" },
  { name: "/clear", description: "Start a new session" },
  { name: "/sessions", description: "List and resume past sessions" },
  { name: "/undo", description: "Undo last changes (git checkout)" },
  { name: "/redo", description: "Redo previously undone changes" },
  { name: "/compact", description: "Compact/summarize the session" },
  { name: "/details", description: "Toggle tool execution details" },
  { name: "/themes", description: "List available themes" },
  { name: "/export", description: "Export conversation to markdown file" },
  { name: "/editor", description: "Open external editor to compose message" },
  { name: "/usage", description: "Show token usage this session" },
  { name: "/mcp", description: "List configured MCP servers" },
  { name: "/help", description: "Show all slash commands" },
  { name: "/exit", description: "Quit" },
]
