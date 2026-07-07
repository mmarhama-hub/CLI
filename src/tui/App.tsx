import React, { useState, useCallback, useRef } from "react"
import { render, Box, Text, useApp, useInput } from "ink"
import TextInput from "ink-text-input"
import pc from "picocolors"
import { buildContext } from "../context"
import { Orchestrator } from "../agent/orchestrator"
import { buildSystemPrompt } from "../agent/prompt"
import { defaultRegistry } from "../tools/registry"
import { createSession, appendMessage, listSessions, loadMessages } from "../core/sessions"
import type { ChatMessage } from "../core/client"
import { SLASH } from "./slash"
import { retrieveContext } from "../rag/indexer"
import { hasIndex } from "../rag/store"
import { resolveModel } from "../util/model"
import { connectMcpServers } from "../mcp/client"
import { Header } from "./components/Header"
import { ContextPanel } from "./components/ContextPanel"
import { CommandPalette } from "./components/CommandPalette"
import { ModelPicker } from "./components/ModelPicker"
import { SessionManager } from "./components/SessionManager"
import { ToastContainer, showToast } from "./components/Toast"
import { StatusBar } from "./components/StatusBar"

export interface Line { role: "user" | "assistant" | "tool" | "system"; text: string }

function Tui() {
  const { exit } = useApp()
  const ctx = useRef(buildContext()).current
  const [model, setModel] = useState(ctx.config.defaultModel)
  const [mode, setMode] = useState(ctx.config.approvalMode)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [tokens, setTokens] = useState(0)
  const [files, setFiles] = useState<string[]>([])
  const historyRef = useRef<ChatMessage[]>([{ role: "system", content: buildSystemPrompt(ctx.cwd) }])
  const sessionRef = useRef<string>(createSession("tui session", ctx.cwd))
  const registryRef = useRef(defaultRegistry())
  const [confirm, setConfirm] = useState<{ summary: string; resolve: (ok: boolean) => void } | null>(null)
  const submitRef = useRef<((value: string) => void) | null>(null)
  const slashHandlerRef = useRef<((cmd: string) => Promise<boolean>) | null>(null)

  React.useEffect(() => {
    connectMcpServers(ctx.config).then((conns) => {
      for (const conn of conns) for (const t of conn.tools) registryRef.current.register(t)
    }).catch(() => {})
  }, [])

  useInput((input, key) => {
    if (showPalette || showModelPicker || showSessions) return
    if (confirm) {
      if (input === "y" || input === "Y" || key.return) { const r = confirm.resolve; setConfirm(null); r(true) }
      else if (input === "n" || input === "N" || key.escape) { const r = confirm.resolve; setConfirm(null); r(false) }
      return
    }
    if (key.escape) exit()
    if (key.ctrl && input === "p") { setShowPanel((p) => !p); return }
    if (key.ctrl && input === "m") { setShowModelPicker(true); return }
    if (key.ctrl && input === "s") { setShowSessions(true); return }
  })

  const push = (l: Line) => setLines((prev) => [...prev, l])
  const appendToLast = (delta: string) =>
    setLines((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, text: last.text + delta }]
      return [...prev, { role: "assistant", text: delta }]
    })

  const handleSlash = async (cmd: string): Promise<boolean> => {
    const [name, arg] = cmd.split(/\s+/, 2)
    switch (name) {
      case "/exit": exit(); return true
      case "/clear": historyRef.current = [{ role: "system", content: buildSystemPrompt(ctx.cwd) }]; setLines([]); showToast("Conversation cleared"); return true
      case "/model": if (arg) { setModel(arg); push({ role: "system", text: `Model → ${arg}` }); showToast(`Model → ${arg}`) } return true
      case "/mode": if (arg) { setMode(arg as typeof mode); push({ role: "system", text: `Mode → ${arg}` }); showToast(`Mode → ${arg}`) } return true
      case "/sessions": setShowSessions(true); return true
      case "/usage": push({ role: "system", text: `Tokens: ${tokens} · Messages: ${lines.length}` }); return true
      case "/mcp": {
        const tools = registryRef.current.list()
        const mcpTools = tools.filter((t) => t.name.startsWith("mcp__"))
        if (mcpTools.length) push({ role: "system", text: mcpTools.map((t) => `• ${t.name}: ${t.description}`).join("\n") })
        else push({ role: "system", text: "No MCP tools connected." })
        return true
      }
      case "/help": push({ role: "system", text: SLASH.map((s) => `${s.name}  ${s.description}`).join("\n") }); return true
      default: return false
    }
  }

  slashHandlerRef.current = handleSlash

  const submit = useCallback(async (value: string) => {
    const text = value.trim()
    setInput("")
    if (!text) return
    if (text.startsWith("/")) { await handleSlash(text); return }
    push({ role: "user", text })
    const userMsg: ChatMessage = { role: "user", content: text }
    historyRef.current.push(userMsg)
    appendMessage(sessionRef.current, userMsg)
    setBusy(true)
    try {
      const resolvedModel = await resolveModel(ctx.client, model, historyRef.current)
      if (hasIndex(ctx.cwd)) {
        const ragContext = await retrieveContext(ctx.client as never, ctx.cwd, text).catch(() => "")
        if (ragContext && historyRef.current[0]?.role === "system") {
          const base = historyRef.current[0].content ?? ""
          if (!base.includes("Relevant code context")) {
            historyRef.current[0] = { role: "system", content: `${base}\n\nRelevant code context:\n${ragContext}` }
          }
        }
      }
      const orch = new Orchestrator(ctx.client, registryRef.current, ctx.config.allowedTools)
      const msgCount = historyRef.current.length
      const { messages } = await orch.run(
        {
          model: resolvedModel, messages: historyRef.current, maxTurns: ctx.config.maxTurns, temperature: ctx.config.temperature,
          toolCtx: {
            cwd: ctx.cwd, approvalMode: mode,
            requestApproval: async (summary) => {
              if (mode === "full-auto") return true
              if (mode === "auto-edit" && !summary.startsWith("Run:")) return true
              return new Promise<boolean>((resolve) => setConfirm({ summary, resolve }))
            },
          },
        },
        {
          onText: (d) => appendToLast(d),
          onToolStart: (c) => {
            push({ role: "tool", text: `⚙ ${c.function.name}(${c.function.arguments.slice(0, 80)})` })
            try { const args = JSON.parse(c.function.arguments); if (args.path) setFiles((p) => [...p, args.path]) } catch {}
          },
          onToolResult: (n, r) => push({ role: "tool", text: `← ${n}: ${r.slice(0, 120)}` }),
          onUsage: (u) => setTokens(u.total_tokens),
        },
      )
      historyRef.current = messages
      for (const m of messages.slice(msgCount)) appendMessage(sessionRef.current, m)
    } finally {
      setBusy(false)
    }
  }, [model, mode, ctx])

  submitRef.current = submit

  const paletteSelect = (cmd: string) => {
    setInput(cmd + " ")
  }

  const resumeSession = (id: string) => {
    const msgs = loadMessages(id)
    if (msgs.length) { historyRef.current = msgs; setLines(msgs.map((m) => ({ role: m.role, text: m.content || "" }))) }
  }

  const chatArea = (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {lines.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text bold color="green">Plugsky CLI</Text>
            <Text dimColor>Type a message or / to see commands. Ctrl+P for context panel.</Text>
          </Box>
        )}
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
      </Box>
      <ToastContainer />
      <Box>
        <Text color="green">{busy ? "● " : "› "}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={(v) => submitRef.current?.(v)}
          placeholder={confirm ? "press y or n" : busy ? "working…" : "Ask Plugsky…"}
        />
      </Box>
    </Box>
  )

  return (
    <Box flexDirection="column" height="100%">
      <Header model={model} mode={mode} cwd={ctx.cwd} tokens={tokens} msgCount={lines.length} busy={busy} showPanel={showPanel} onTogglePanel={() => setShowPanel((p) => !p)} />
      <Box flexDirection="row" flexGrow={1}>
        {chatArea}
        <ContextPanel lines={lines} msgCount={lines.length} fileList={files} show={showPanel} />
      </Box>
      <StatusBar model={model} mode={mode} msgCount={lines.length} showPanelHint={!showPanel} />
      <CommandPalette visible={showPalette} onSelect={paletteSelect} onClose={() => setShowPalette(false)} />
      <ModelPicker visible={showModelPicker} currentModel={model} onSelect={(m) => { setModel(m); showToast(`Model → ${m}`) }} onClose={() => setShowModelPicker(false)} client={ctx.client} />
      <SessionManager visible={showSessions} cwd={ctx.cwd} onResume={resumeSession} onClose={() => setShowSessions(false)} />
    </Box>
  )
}

export async function startTui(): Promise<void> {
  const { waitUntilExit } = render(<Tui />)
  await waitUntilExit()
}
