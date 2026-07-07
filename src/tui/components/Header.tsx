import React from "react"
import { Box, Text } from "ink"
import pc from "picocolors"
import type { Ctx } from "../../context"

export function Header({
  model, mode, cwd, tokens, msgCount, busy, showPanel, onTogglePanel,
}: {
  model: string; mode: string; cwd: string; tokens: number; msgCount: number; busy: boolean; showPanel: boolean; onTogglePanel: () => void
}) {
  const modeColor = mode === "full-auto" ? "red" : mode === "auto-edit" ? "blue" : "yellow"
  return (
    <Box borderStyle="single" borderColor="gray" flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box gap={2}>
        <Text bold color="green">plugsky</Text>
        <Text dimColor>|</Text>
        <Text color="cyan">{model}</Text>
        <Text dimColor>|</Text>
        <Text color={modeColor as any}>{mode}</Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>{tokens > 0 ? `${tokens} tok` : ""}</Text>
        <Text dimColor>{msgCount} msgs</Text>
        <Text color="gray" dimColor={!showPanel}>Ctrl+P</Text>
        {busy && <Text color="green">● busy</Text>}
      </Box>
    </Box>
  )
}
