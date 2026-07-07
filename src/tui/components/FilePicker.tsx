import React, { useState, useEffect, useRef } from "react"
import { Box, Text, useInput } from "ink"
import fg from "fast-glob"

export function FilePicker({
  visible, query, cwd, onSelect, onClose, onQueryChange,
}: {
  visible: boolean; query: string; cwd: string; onSelect: (p: string) => void; onClose: () => void; onQueryChange: (q: string) => void
}) {
  const [files, setFiles] = useState<string[]>([])
  const [sel, setSel] = useState(0)
  const cacheRef = useRef<string[]>([])

  useEffect(() => {
    if (!visible) return
    if (cacheRef.current.length === 0) {
      fg("**/*.{ts,tsx,js,jsx,py,go,rs,json,md,txt,html,css,php}", { cwd, ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/vendor/**"], dot: false }).then((r) => { cacheRef.current = r; setFiles(r) }).catch(() => {})
    }
  }, [visible, cwd])

  useEffect(() => {
    if (!visible) return
    const q = query.replace("@", "").toLowerCase()
    const filtered = q ? cacheRef.current.filter((f) => f.toLowerCase().includes(q)) : cacheRef.current
    setFiles(filtered)
    setSel(0)
  }, [query, visible])

  useInput((input, key) => {
    if (!visible) return
    if (key.escape) { onClose(); return }
    if (key.return && files[sel]) { onSelect(files[sel]); onClose(); return }
    if (key.upArrow) { setSel(Math.max(0, sel - 1)); return }
    if (key.downArrow) { setSel(Math.min(files.length - 1, sel + 1)); return }
  })

  if (!visible || files.length === 0) return null
  return (
    <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
      <Text bold>@ files</Text>
      <Text dimColor>{files.length} matches</Text>
      <Box flexDirection="column" marginTop={1} height={14}>
        {files.slice(0, 20).map((f, i) => (
          <Text key={f} color={i === sel ? "cyan" : "white"} bold={i === sel}>
            {i === sel ? "▸ " : "  "}{f}
          </Text>
        ))}
      </Box>
      <Text dimColor>↑↓ Enter select · Esc close</Text>
    </Box>
  )
}
