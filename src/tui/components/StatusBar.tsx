import React from "react"
import { Box, Text } from "ink"

export function StatusBar({
  model, mode, msgCount, showPanelHint, agentMode,
}: {
  model: string; mode: string; msgCount: number; showPanelHint: boolean; agentMode: string
}) {
  return (
    <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
      <Box gap={1}>
        <Text dimColor>/? help</Text>
        <Text dimColor>Tab {agentMode === "build" ? "→ plan" : "→ build"}</Text>
        {showPanelHint && <Text dimColor>Ctrl+P palette</Text>}
        <Text dimColor>Ctrl+I panel</Text>
        <Text dimColor>Ctrl+M model</Text>
      </Box>
      <Text dimColor>{model} · {agentMode === "plan" ? "PLAN" : "BUILD"} · {mode} · {msgCount} msgs</Text>
    </Box>
  )
}
