import React, { useState, useEffect } from "react"
import { Box, Text, useInput } from "ink"
import { listSessions, deleteSession } from "../../core/sessions"

export function SessionManager({
  visible, cwd, onResume, onClose,
}: {
  visible: boolean; cwd: string; onResume: (id: string) => void; onClose: () => void
}) {
  const [sel, setSel] = useState(0)
  const sessions = listSessions(20).filter((s) => s.cwd === cwd)

  useEffect(() => { if (visible) setSel(0) }, [visible])

  useInput((input, key) => {
    if (!visible) return
    if (key.escape) { onClose(); return }
    if (key.return && sessions[sel]) { onResume(sessions[sel].id); onClose(); return }
    if (key.upArrow) { setSel(Math.max(0, sel - 1)); return }
    if (key.downArrow) { setSel(Math.min(sessions.length - 1, sel + 1)); return }
    if (key.delete && sessions[sel]) { deleteSession(sessions[sel].id); setSel(0); return }
  })

  if (!visible) return null
  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Text bold>Sessions</Text>
      <Text dimColor>{sessions.length} in this directory</Text>
      <Box flexDirection="column" marginTop={1} height={12}>
        {sessions.length === 0 && <Text dimColor>no sessions yet</Text>}
        {sessions.map((s, i) => (
          <Text key={s.id} color={i === sel ? "cyan" : "white"} bold={i === sel}>
            {i === sel ? "▸ " : "  "}{s.id.slice(0, 8)}  {s.title.slice(0, 40)}
          </Text>
        ))}
      </Box>
      <Text dimColor>↑↓ navigate · Enter resume · Del delete · Esc close</Text>
    </Box>
  )
}
