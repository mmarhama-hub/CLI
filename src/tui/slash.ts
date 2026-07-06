export interface SlashCommand { name: string; description: string }
export const SLASH: SlashCommand[] = [
  { name: "/model", description: "Switch model (e.g. /model plugsky-pro)" },
  { name: "/mode", description: "Set approval mode: suggest | auto-edit | full-auto" },
  { name: "/clear", description: "Clear the conversation" },
  { name: "/sessions", description: "List and resume past sessions" },
  { name: "/usage", description: "Show token usage this session" },
  { name: "/mcp", description: "List connected MCP servers & tools" },
  { name: "/help", description: "Show slash commands" },
  { name: "/exit", description: "Quit" },
]
