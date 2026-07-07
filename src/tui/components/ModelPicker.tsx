import React, { useState, useEffect } from "react"
import { Box, Text, useInput } from "ink"
import { PlugskyClient } from "../../core/client"

const MODELS = ["plugsky-micro", "plugsky-minimax", "plugsky-pro", "plugsky-frontier", "plugsky-reasoning", "plugsky-coder", "plugsky-plus", "plugsky-max", "plugsky-kimi", "plugsky-lite", "plugsky-nano", "plugsky-ultra", "plugsky-phi", "plugsky-tiny", "plugsky-llama4", "plugsky-longctx", "plugsky-coder-fast", "plugsky-gemma-4", "plugsky-deepseek-pro", "plugsky-deepseek-flash", "plugsky-gpt-oss", "plugsky-qwen-next", "plugsky-qwen-vl", "plugsky-vision-fast", "plugsky-mistral-medium", "plugsky-mistral-small", "plugsky-gemma3-nano-2b", "plugsky-gemma3-nano-4b", "plugsky-minimax"]

export function ModelPicker({
  visible, currentModel, onSelect, onClose, client,
}: {
  visible: boolean; currentModel: string; onSelect: (m: string) => void; onClose: () => void; client: PlugskyClient
}) {
  const [query, setQuery] = useState("")
  const [sel, setSel] = useState(0)
  const [remote, setRemote] = useState<string[]>([])
  const all = [...new Set([...MODELS, ...remote])].sort()

  useEffect(() => {
    if (visible) { setQuery(""); setSel(0); client.listModels().then((r) => setRemote(r.map((x) => x.id))).catch(() => {}) }
  }, [visible])

  const filtered = all.filter((m) => !query || m.includes(query))

  useInput((input, key) => {
    if (!visible) return
    if (key.escape) { onClose(); return }
    if (key.return && filtered[sel]) { onSelect(filtered[sel]); onClose(); return }
    if (key.upArrow) { setSel(Math.max(0, sel - 1)); return }
    if (key.downArrow) { setSel(Math.min(filtered.length - 1, sel + 1)); return }
    if (input === "\b" || key.delete) { setQuery((p) => p.slice(0, -1)); setSel(0); return }
    if (input.length === 1 && !key.ctrl) { setQuery((p) => p + input); setSel(0); return }
  })

  if (!visible) return null
  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Text bold>Model picker</Text>
      <Text dimColor>{query ? `search: ${query}` : `${filtered.length} models`}</Text>
      <Box flexDirection="column" marginTop={1} height={16}>
        {filtered.slice(0, 25).map((m, i) => (
          <Text key={m} color={i === sel ? "cyan" : m === currentModel ? "green" : "white"} bold={i === sel || m === currentModel}>
            {i === sel ? "▸ " : m === currentModel ? "★ " : "  "}{m}
          </Text>
        ))}
      </Box>
      <Text dimColor>↑↓ navigate · Enter select · Esc close</Text>
    </Box>
  )
}
