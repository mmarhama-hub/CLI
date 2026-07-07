import React from "react"
import { Box, Text } from "ink"

export function StatusBar({
  model, mode, msgCount, showPanelHint,
}: {
  model: string; mode: string; msgCount: number; showPanelHint: boolean
}) {
  return (
    <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
      <Box gap={1}>
        <Text dimColor>/? help</Text>
        {showPanelHint && <Text dimColor>Ctrl+P panel</Text>}
        <Text dimColor>Ctrl+M model</Text>
        <Text dimColor>Ctrl+S sessions</Text>
      </Box>
      <Text dimColor>{model} · {mode} · {msgCount} msgs</Text>
    </Box>
  )
}
