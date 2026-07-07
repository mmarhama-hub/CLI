import React, { useRef, useEffect, useState, useCallback } from "react"
import { Box, Text } from "ink"

export interface ToastMsg { id: number; text: string; color?: string }

let toastId = 0
const listeners: Array<(t: ToastMsg) => void> = []

export function showToast(text: string, color = "green") {
  const msg: ToastMsg = { id: ++toastId, text, color }
  listeners.forEach((l) => l(msg))
}

export function ToastContainer() {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handler = useCallback((t: ToastMsg) => {
    setMsg(t)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setMsg(null), 3000)
  }, [])

  useEffect(() => { listeners.push(handler); return () => { const i = listeners.indexOf(handler); if (i >= 0) listeners.splice(i, 1) } }, [handler])

  if (!msg) return null
  return (
    <Box>
      <Text color={msg.color as any}>{msg.text}</Text>
    </Box>
  )
}
