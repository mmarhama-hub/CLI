import React, { useState, useEffect } from "react"
import { Box, Text, useInput } from "ink"
import { SLASH } from "../slash"

export function CommandPalette({
  visible, onSelect, onClose,
}: {
  visible: boolean; onSelect: (cmd: string) => void; onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [sel, setSel] = useState(0)

  useEffect(() => { if (visible) { setQuery(""); setSel(0) } }, [visible])

  const filtered = SLASH.filter((s) => !query || s.name.includes(query) || s.description.toLowerCase().includes(query.toLowerCase()))

  useInput((input, key) => {
    if (!visible) return
    if (key.escape) { onClose(); return }
    if (key.return && filtered[sel]) { onSelect(filtered[sel].name); onClose(); return }
    if (key.upArrow) { setSel(Math.max(0, sel - 1)); return }
    if (key.downArrow) { setSel(Math.min(filtered.length - 1, sel + 1)); return }
    if (input === "\b" || key.delete) { setQuery((p) => p.slice(0, -1)); setSel(0); return }
    if (input.length === 1 && !key.ctrl) { setQuery((p) => p + input); setSel(0); return }
  })

  if (!visible) return null
  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Text bold>/ commands</Text>
      <Text dimColor>{query ? `filter: ${query}` : "type to search"}</Text>
      <Box flexDirection="column" marginTop={1}>
        {filtered.map((s, i) => (
          <Text key={s.name} color={i === sel ? "cyan" : "white"} bold={i === sel}>
            {i === sel ? "▸ " : "  "}{s.name.padEnd(16)}{s.description}
          </Text>
        ))}
        {filtered.length === 0 && <Text dimColor>no matching commands</Text>}
      </Box>
    </Box>
  )
}
