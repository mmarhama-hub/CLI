import React from "react"
import { Box, Text } from "ink"

export function Header({
  model, mode, cwd, tokens, msgCount, busy, showPanel, agentMode,
}: {
  model: string; mode: string; cwd: string; tokens: number; msgCount: number; busy: boolean; showPanel: boolean; agentMode: string
}) {
  const modeColor = mode === "full-auto" ? "red" : mode === "auto-edit" ? "blue" : "yellow"
  const tier = model === "plugsky-micro" || model === "plugsky-lite" ? "free" : "pro"
  return (
    <Box borderStyle="single" borderColor="gray" flexDirection="row" justifyContent="space-between" paddingX={2} paddingY={0}>
      <Box gap={3}>
        <Text bold color="green">plugsky</Text>
        <Box>
          <Text dimColor>model </Text>
          <Text color="cyan" bold>{model}</Text>
          <Text dimColor>  / </Text>
          <Text color={tier === "free" ? "green" : "yellow"}>{tier}</Text>
        </Box>
        <Box>
          <Text dimColor>mode </Text>
          <Text color={modeColor as any}>{mode}</Text>
        </Box>
        <Text bold color={agentMode === "plan" ? "yellow" : "green"}>{agentMode === "plan" ? "plan" : "build"}</Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>{msgCount} msgs</Text>
        {tokens > 0 && <Text dimColor>{tokens} tok</Text>}
        {busy && <Text color="green" bold>●</Text>}
      </Box>
    </Box>
  )
}
