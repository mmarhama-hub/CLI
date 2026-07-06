import type { PlugskyClient, ChatMessage } from "../core/client"

export async function resolveModel(client: PlugskyClient, model: string, messages: ChatMessage[]): Promise<string> {
  if (model !== "auto") return model
  const result = await client.route({ messages }).catch(() => null)
  const selected = result?.plugsky_routing?.selected_model
  if (selected) return selected
  return "plugsky-micro"
}
