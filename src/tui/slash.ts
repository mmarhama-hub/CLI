export interface SlashCommand { name: string; description: string }
export const SLASH: SlashCommand[] = [
  { name: "/model", description: "Switch model (e.g. /model plugsky-pro)" },
  { name: "/mode", description: "Set approval mode: suggest | auto-edit | full-auto" },
  { name: "/clear", description: "Clear the conversation" },
  { name: "/sessions", description: "List and resume past sessions" },
  { name: "/usage", description: "Show usage via: plugsky usage (terminal)" },
  { name: "/mcp", description: "List configured MCP servers" },
  { name: "/help", description: "Show slash commands" },
  { name: "/exit", description: "Quit" },
]
