import React from "react"
import { Box, Text } from "ink"
import type { Line } from "../App"

export function ContextPanel({
  lines, msgCount, fileList, show,
}: {
  lines: Line[]; msgCount: number; fileList: string[]; show: boolean
}) {
  if (!show) return null
  const toolCalls = lines.filter((l) => l.role === "tool").length
  const assistantMsgs = lines.filter((l) => l.role === "assistant").length
  const userMsgs = lines.filter((l) => l.role === "user").length
  const uniqueFiles = [...new Set(fileList)]
  return (
    <Box borderStyle="single" borderColor="gray" flexDirection="column" width={28} paddingX={1} marginLeft={1}>
      <Text bold underline>Context</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>Messages: {msgCount}</Text>
        <Text dimColor>You: {userMsgs}</Text>
        <Text dimColor>AI: {assistantMsgs}</Text>
        <Text dimColor>Tool calls: {toolCalls}</Text>
      </Box>
      {uniqueFiles.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold dimColor>Files</Text>
          {uniqueFiles.slice(0, 8).map((f) => (
            <Text key={f} dimColor wrap="truncate"> {f}</Text>
          ))}
          {uniqueFiles.length > 8 && <Text dimColor> ...+{uniqueFiles.length - 8}</Text>}
        </Box>
      )}
    </Box>
  )
}
