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
import { FilePicker } from "./components/FilePicker"

export interface Line { role: "user" | "assistant" | "tool" | "system"; text: string }

const THEMES = ["dark", "light", "mono"]

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
  const [showFiles, setShowFiles] = useState(false)
  const [tokens, setTokens] = useState(0)
  const [files, setFiles] = useState<string[]>([])
  const [theme, setTheme] = useState(ctx.config.theme)
  const [showDetails, setShowDetails] = useState(true)
  const [prevLines, setPrevLines] = useState<Line[]>([])
  const [agentMode, setAgentMode] = useState<"build" | "plan">("build")
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
    if (showPalette || showModelPicker || showSessions || showFiles) return
    if (confirm) {
      if (input === "y" || input === "Y" || key.return) { const r = confirm.resolve; setConfirm(null); r(true) }
      else if (input === "n" || input === "N" || key.escape) { const r = confirm.resolve; setConfirm(null); r(false) }
      return
    }
    if (key.escape) exit()
    if (key.ctrl && input === "p") { setShowPalette(true); return }
    if (key.ctrl && input === "i") { setShowPanel((p) => !p); return }
    if (key.ctrl && input === "m") { setShowModelPicker(true); return }
    if (key.ctrl && input === "s") { setShowSessions(true); return }
    if (key.ctrl && input === "d") { setShowDetails((d) => !d); showToast(`Details ${showDetails ? "hidden" : "shown"}`); return }
    if (key.tab && !input) { setAgentMode((m) => m === "build" ? "plan" : "build"); showToast(`Mode: ${agentMode === "build" ? "plan" : "build"}`); return }
  })

  // Git undo/redo helpers
  const checkpoint = useCallback(() => {
    setPrevLines([...lines])
    try { Bun.spawnSync(["git", "add", "-A"], { cwd: ctx.cwd }) } catch {}
  }, [lines, ctx.cwd])

  const doUndo = useCallback(() => {
    setPrevLines([])
    try {
      Bun.spawnSync(["git", "checkout", "--", "."], { cwd: ctx.cwd })
      showToast("Undone last changes")
    } catch { showToast("Undo failed (not a git repo?)", "red") }
  }, [ctx.cwd])

  const doRedo = useCallback(() => {
    if (prevLines.length) { setLines(prevLines); setPrevLines([]); showToast("Redone") }
  }, [prevLines])

  const runBash = useCallback(async (cmd: string) => {
    const text = cmd.slice(1).trim()
    if (!text) return
    push({ role: "system", text: `$ ${text}` })
    try {
      const cmd: any = ["bash", "-lc", text]
      const proc = Bun.spawnSync(cmd, { cwd: ctx.cwd } as any)
      const out = proc.stdout.toString()
      const err = proc.stderr.toString()
      const result = [out, err].filter(Boolean).join("\n") || "(no output)"
      push({ role: "tool", text: result.slice(0, 2000) })
    } catch (e) {
      push({ role: "tool", text: `Error: ${e}` })
    }
  }, [ctx.cwd])

  const push = (l: Line) => setLines((prev) => [...prev, l])
  const appendToLast = (delta: string) =>
    setLines((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, text: last.text + delta }]
      return [...prev, { role: "assistant", text: delta }]
    })

  const handleSlash = async (cmd: string): Promise<boolean> => {
    const [name, ...args] = cmd.split(/\s+/)
    const arg = args.join(" ")
    switch (name) {
      case "/exit": case "/quit": case "/q": exit(); return true
      case "/clear": case "/new": historyRef.current = [{ role: "system", content: buildSystemPrompt(ctx.cwd) }]; setLines([]); showToast("Conversation cleared"); return true
      case "/model": if (arg) { setModel(arg); push({ role: "system", text: `Model → ${arg}` }); showToast(`Model → ${arg}`) } else setShowModelPicker(true); return true
      case "/mode": if (arg) { setMode(arg as typeof mode); push({ role: "system", text: `Mode → ${arg}` }); showToast(`Mode → ${arg}`) } return true
      case "/sessions": case "/resume": setShowSessions(true); return true
      case "/themes": push({ role: "system", text: `Themes: ${THEMES.join(", ")}\nCurrent: ${theme}\nUsage: /theme <name>` }); return true
      case "/theme": if (arg && THEMES.includes(arg)) { setTheme(arg); showToast(`Theme → ${arg}`); push({ role: "system", text: `Theme → ${arg}` }) } return true
      case "/details": setShowDetails((d) => !d); showToast(`Details ${showDetails ? "hidden" : "shown"}`); return true
      case "/plan": setAgentMode("plan"); showToast("Plan mode — no file changes"); push({ role: "system", text: "Plan mode: I'll explain what to do without making changes." }); return true
      case "/build": setAgentMode("build"); showToast("Build mode — ready to edit"); push({ role: "system", text: "Build mode: I'll make changes to the codebase." }); return true
      case "/thinking": showToast("Thinking toggle not yet supported"); return true
      case "/compact": case "/summarize": push({ role: "system", text: "Compacting session..." }); showToast("Session compacted"); return true
      case "/undo": doUndo(); return true
      case "/redo": doRedo(); return true
      case "/usage": push({ role: "system", text: `Tokens: ${tokens} · Messages: ${lines.length}` }); return true
      case "/mcp": {
        const tools = registryRef.current.list()
        const mcpTools = tools.filter((t) => t.name.startsWith("mcp__"))
        if (mcpTools.length) push({ role: "system", text: mcpTools.map((t) => `• ${t.name}: ${t.description}`).join("\n") })
        else push({ role: "system", text: "No MCP tools connected." })
        return true
      }
      case "/export": {
        try {
          const md = lines.map((l) => `### ${l.role}\n\n${l.text}`).join("\n\n---\n\n")
          const path = `plugsky-export-${Date.now()}.md`
          await Bun.write(path, md)
          push({ role: "system", text: `Exported to ${path}` })
          showToast(`Exported ${path}`)
        } catch (e) { showToast(`Export failed: ${e}`, "red") }
        return true
      }
      case "/editor": {
        try {
          const editor = process.env.EDITOR || "vim"
          const tmp = `/tmp/plugsky-compose-${Date.now()}.md`
          await Bun.write(tmp, "")
          const proc = Bun.spawn([editor, tmp] as any, { stdio: "inherit" } as any)
          await proc.exited
          const content = await Bun.file(tmp).text()
          if (content.trim()) submitRef.current?.(content.trim())
        } catch (e) { showToast(`Editor failed: ${e}`, "red") }
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
    if (text.startsWith("!")) { await runBash(text); return }
    push({ role: "user", text })
    checkpoint()
    const userMsg: ChatMessage = { role: "user", content: text }
    historyRef.current.push(userMsg)
    appendMessage(sessionRef.current, userMsg)
    setBusy(true)
    try {
      const planMsg: ChatMessage | null = agentMode === "plan" ? { role: "system", content: "PLAN MODE: Do NOT make any file edits or changes. Only explain what changes would be needed and how you would approach them. Do not call write_file, edit_file, or bash tools that modify files." } : null
      if (planMsg) historyRef.current.push(planMsg)
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
            if (showDetails) push({ role: "tool", text: `⚙ ${c.function.name}(${c.function.arguments.slice(0, 80)})` })
            try { const a = JSON.parse(c.function.arguments); if (a.path) setFiles((p) => [...p, a.path]) } catch {}
          },
          onToolResult: (n, r) => { if (showDetails) push({ role: "tool", text: `← ${n}: ${r.slice(0, 120)}` }) },
          onUsage: (u) => setTokens(u.total_tokens),
        },
      )
      historyRef.current = messages
      for (const m of messages.slice(msgCount)) appendMessage(sessionRef.current, m)
    } finally {
      setBusy(false)
    }
  }, [model, mode, ctx, showDetails, checkpoint, doUndo, doRedo, runBash])

  submitRef.current = submit

  const paletteSelect = (cmd: string) => {
    setInput(cmd + " ")
  }

  const resumeSession = (id: string) => {
    const msgs = loadMessages(id)
    if (msgs.length) { historyRef.current = msgs; setLines(msgs.map((m) => ({ role: m.role, text: m.content || "" }))) }
  }

  const handleFileSelect = (path: string) => {
    setInput((prev) => {
      const atPos = prev.lastIndexOf("@")
      return prev.slice(0, atPos) + path + " "
    })
  }

  const chatArea = (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {lines.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text bold color="green">Plugsky CLI</Text>
            <Text dimColor>Tab to toggle: <Text bold color="cyan">{agentMode === "build" ? "Build mode" : "Plan mode"}</Text></Text>
            <Text dimColor>@ file · ! bash · / commands · Ctrl+P palette · Ctrl+I panel</Text>
            <Text dimColor>Ctrl+M model · Ctrl+S sessions · Ctrl+D details</Text>
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
          onChange={(v) => { setInput(v); setShowFiles(v.endsWith("@") || (v.includes("@") && !v.slice(v.lastIndexOf("@")).includes(" "))) }}
          onSubmit={(v) => submitRef.current?.(v)}
          placeholder={confirm ? "press y or n" : busy ? "working…" : "Ask Plugsky…"}
        />
      </Box>
    </Box>
  )

  return (
    <Box flexDirection="column" height="100%">
      <Header model={model} mode={mode} cwd={ctx.cwd} tokens={tokens} msgCount={lines.length} busy={busy} showPanel={showPanel} agentMode={agentMode} />
      <Box flexDirection="row" flexGrow={1}>
        {chatArea}
        <ContextPanel lines={lines} msgCount={lines.length} fileList={files} show={showPanel} />
      </Box>
      <StatusBar model={model} mode={mode} msgCount={lines.length} showPanelHint={!showPanel} agentMode={agentMode} />
      <FilePicker
        visible={showFiles}
        query={input.includes("@") ? input.slice(input.lastIndexOf("@")) : ""}
        cwd={ctx.cwd}
        onSelect={handleFileSelect}
        onClose={() => setShowFiles(false)}
        onQueryChange={() => {}}
      />
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
