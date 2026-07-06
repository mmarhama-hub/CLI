import React, { useState, useCallback, useRef } from "react"
import { render, Box, Text, useApp, useInput } from "ink"
import TextInput from "ink-text-input"
import pc from "picocolors"
import { buildContext } from "../context"
import { Orchestrator } from "../agent/orchestrator"
import { buildSystemPrompt } from "../agent/prompt"
import { defaultRegistry } from "../tools/registry"
import { createSession, appendMessage } from "../core/sessions"
import type { ChatMessage } from "../core/client"
import { SLASH } from "./slash"
import { retrieveContext } from "../rag/indexer"
import { resolveModel } from "../util/model"

interface Line { role: "user" | "assistant" | "tool" | "system"; text: string }

function Tui() {
  const { exit } = useApp()
  const ctx = useRef(buildContext()).current
  const [model, setModel] = useState(ctx.config.defaultModel)
  const [mode, setMode] = useState(ctx.config.approvalMode)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<Line[]>([{ role: "system", text: `Plugsky · ${model} · ${mode}. Type /help for commands.` }])
  const historyRef = useRef<ChatMessage[]>([{ role: "system", content: buildSystemPrompt(ctx.cwd) }])
  const sessionRef = useRef<string>(createSession("tui session", ctx.cwd))
  const orch = useRef(new Orchestrator(ctx.client, defaultRegistry(), ctx.config.allowedTools)).current
  const [confirm, setConfirm] = useState<{ summary: string; resolve: (ok: boolean) => void } | null>(null)

  const submitRef = useRef<((value: string) => void) | null>(null)

  useInput((input, key) => {
    if (confirm) {
      if (input === "y" || input === "Y" || key.return) { const r = confirm.resolve; setConfirm(null); r(true) }
      else if (input === "n" || input === "N" || key.escape) { const r = confirm.resolve; setConfirm(null); r(false) }
      return
    }
    if (key.escape) exit()
  })

  const push = (l: Line) => setLines((prev) => [...prev, l])
  const appendToLast = (delta: string) =>
    setLines((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, text: last.text + delta }]
      return [...prev, { role: "assistant", text: delta }]
    })

  const handleSlash = (cmd: string): boolean => {
    const [name, arg] = cmd.split(/\s+/, 2)
    switch (name) {
      case "/exit": exit(); return true
      case "/clear": historyRef.current = [{ role: "system", content: buildSystemPrompt(ctx.cwd) }]; setLines([{ role: "system", text: "Cleared." }]); return true
      case "/model": if (arg) { setModel(arg as typeof model); push({ role: "system", text: `Model → ${arg}` }) } return true
      case "/mode": if (arg) { setMode(arg as typeof mode); push({ role: "system", text: `Mode → ${arg}` }) } return true
      case "/help": push({ role: "system", text: SLASH.map((s) => `${s.name}  ${s.description}`).join("\n") }); return true
      default: return false
    }
  }

  submitRef.current = async (value: string) => {
    const text = value.trim()
    setInput("")
    if (!text) return
    if (text.startsWith("/") && handleSlash(text)) return
    push({ role: "user", text })
    const userMsg: ChatMessage = { role: "user", content: text }
    historyRef.current.push(userMsg)
    appendMessage(sessionRef.current, userMsg)
    setBusy(true)
    try {
      const resolvedModel = await resolveModel(ctx.client, model, historyRef.current)
      const ragContext = await retrieveContext(ctx.client as never, ctx.cwd, text).catch(() => "")
      if (ragContext && historyRef.current[0]?.role === "system") {
        const base = historyRef.current[0].content ?? ""
        if (!base.includes("Relevant code context")) {
          historyRef.current[0] = { role: "system", content: `${base}\n\nRelevant code context:\n${ragContext}` }
        }
      }

      const { messages } = await orch.run(
        {
          model: resolvedModel, messages: historyRef.current, maxTurns: ctx.config.maxTurns, temperature: ctx.config.temperature,
          toolCtx: {
            cwd: ctx.cwd, approvalMode: mode,
            requestApproval: async (summary) => {
              if (mode === "full-auto") return true
              if (mode === "auto-edit" && !summary.startsWith("Run:")) return true
              return new Promise<boolean>((resolve) => {
                setConfirm({ summary, resolve })
              })
            },
          },
        },
        {
          onText: (d) => appendToLast(d),
          onToolStart: (c) => push({ role: "tool", text: `⚙ ${c.function.name}` }),
          onToolResult: (n, r) => push({ role: "tool", text: `← ${n}: ${r.slice(0, 120)}` }),
        },
      )
      historyRef.current = messages
      for (const m of messages.filter((mm) => mm.role !== "system")) appendMessage(sessionRef.current, m)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box flexDirection="column">
      {lines.map((l, i) => (
        <Box key={i} marginBottom={l.role === "assistant" ? 1 : 0}>
          <Text color={l.role === "user" ? "cyan" : l.role === "tool" ? "gray" : l.role === "system" ? "yellow" : "white"}>
            {l.role === "user" ? "› " : ""}{l.text}
          </Text>
        </Box>
      ))}
      {confirm && (
        <Box>
          <Text color="yellow">? {confirm.summary} — approve? (y/N) </Text>
        </Box>
      )}
      <Box>
        <Text color="green">{busy ? "● " : "› "}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={(v) => submitRef.current?.(v)}
          placeholder={confirm ? "press y or n" : busy ? "working…" : "Ask Plugsky… (/help, Esc to quit)"}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{`${model} · ${mode} · ${ctx.cwd}`}</Text>
      </Box>
    </Box>
  )
}

export async function startTui(): Promise<void> {
  const { waitUntilExit } = render(<Tui />)
  await waitUntilExit()
}
