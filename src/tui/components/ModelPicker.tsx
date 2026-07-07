import React, { useState, useEffect } from "react"
import { Box, Text, useInput } from "ink"
import { PlugskyClient } from "../../core/client"

const MODELS: Array<{ id: string; tier: string; ctx: string }> = [
  { id: "plugsky-micro",    tier: "free",  ctx: "128K" },
  { id: "plugsky-lite",     tier: "free",  ctx: "32K" },
  { id: "plugsky-plus",     tier: "pro",   ctx: "128K" },
  { id: "plugsky-pro",      tier: "pro",   ctx: "128K" },
  { id: "plugsky-max",      tier: "pro",   ctx: "128K" },
  { id: "plugsky-frontier", tier: "pro",   ctx: "128K" },
  { id: "plugsky-reasoning",tier: "pro",   ctx: "64K" },
  { id: "plugsky-coder",    tier: "pro",   ctx: "128K" },
  { id: "plugsky-minimax",  tier: "pro",   ctx: "32K" },
  { id: "plugsky-kimi",     tier: "pro",   ctx: "1M" },
  { id: "plugsky-nano",     tier: "pro",   ctx: "1M" },
  { id: "plugsky-ultra",    tier: "pro",   ctx: "1M" },
  { id: "plugsky-llama4",   tier: "pro",   ctx: "128K" },
  { id: "plugsky-longctx",  tier: "pro",   ctx: "128K" },
  { id: "plugsky-deepseek-pro", tier: "pro", ctx: "1M" },
  { id: "plugsky-deepseek-flash",tier:"pro", ctx: "32K" },
  { id: "plugsky-qwen-next",tier: "pro",   ctx: "128K" },
  { id: "plugsky-mistral-medium",tier:"pro",ctx:"128K" },
  { id: "plugsky-mistral-small",tier:"pro", ctx:"128K" },
  { id: "plugsky-qwen-vl",  tier: "pro",   ctx: "128K" },
  { id: "plugsky-vision-fast",tier:"pro",  ctx: "32K" },
  { id: "plugsky-coder-fast",tier: "pro",  ctx: "32K" },
  { id: "plugsky-phi",      tier: "pro",   ctx: "128K" },
  { id: "plugsky-tiny",     tier: "pro",   ctx: "128K" },
  { id: "plugsky-gemma-4",  tier: "pro",   ctx: "32K" },
  { id: "plugsky-gemma3-nano-2b",tier:"pro",ctx:"32K" },
  { id: "plugsky-gemma3-nano-4b",tier:"pro",ctx:"32K" },
  { id: "plugsky-gpt-oss",  tier: "pro",   ctx: "128K" },
  { id: "plugsky-embed",    tier: "embed", ctx: "8K" },
  { id: "plugsky-embed-nim",tier: "embed", ctx: "8K" },
  { id: "plugsky-embed-multilingual",tier:"embed",ctx:"8K" },
]

export function ModelPicker({
  visible, currentModel, onSelect, onClose, client,
}: {
  visible: boolean; currentModel: string; onSelect: (m: string) => void; onClose: () => void; client: PlugskyClient
}) {
  const [query, setQuery] = useState("")
  const [sel, setSel] = useState(0)

  useEffect(() => { if (visible) { setQuery(""); setSel(0) } }, [visible])

  const filtered = MODELS.filter((m) => !query || m.id.includes(query) || m.tier.includes(query))
  const tiers = ["free", "pro", "embed"] as const
  const tierColors = { free: "green", pro: "yellow", embed: "blue" } as const
  const tierLabels = { free: "FREE", pro: "PRO", embed: "EMBED" } as const

  useInput((input, key) => {
    if (!visible) return
    if (key.escape) { onClose(); return }
    if (key.return && filtered[sel]) { onSelect(filtered[sel].id); onClose(); return }
    if (key.upArrow) { setSel(Math.max(0, sel - 1)); return }
    if (key.downArrow) { setSel(Math.min(filtered.length - 1, sel + 1)); return }
    if (input === "\b" || key.delete) { setQuery((p) => p.slice(0, -1)); setSel(0); return }
    if (input.length === 1 && !key.ctrl) { setQuery((p) => p + input); setSel(0); return }
  })

  if (!visible) return null
  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} width={60}>
      <Text bold>Model picker</Text>
      <Text dimColor>{query ? `filter: ${query}` : `${filtered.length} models — ↑↓ Enter, Esc close`}</Text>
      <Box flexDirection="column" marginTop={1} height={20}>
        {filtered.length === 0 && <Text dimColor>no matching models</Text>}
        {tiers.map((tier) => {
          const items = filtered.filter((m) => m.tier === tier)
          if (items.length === 0) return null
          return (
            <Box key={tier} flexDirection="column">
              <Text bold color={tierColors[tier]}>{tierLabels[tier].padStart(6)}</Text>
              {items.map((m, i) => {
                const globalIdx = filtered.indexOf(m)
                return (
                  <Text key={m.id} color={globalIdx === sel ? "cyan" : m.id === currentModel ? "green" : "white"} bold={globalIdx === sel}>
                    {globalIdx === sel ? "▸ " : m.id === currentModel ? "★ " : "  "}
                    {m.id.padEnd(24)}
                    <Text dimColor>{m.ctx}</Text>
                  </Text>
                )
              })}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
