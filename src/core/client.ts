import { ApiError } from "./errors"
import { parseSSE } from "../util/sse"

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}
export interface ToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}
export interface ToolSchema {
  type: "function"
  function: { name: string; description: string; parameters: Record<string, unknown> }
}
export interface ChatOptions {
  model: string
  messages: ChatMessage[]
  tools?: ToolSchema[]
  temperature?: number
  max_tokens?: number
  signal?: AbortSignal
}
export interface Usage { prompt_tokens: number; completion_tokens: number; total_tokens: number }
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "usage"; usage: Usage }
  | { type: "done"; finishReason: string }

export class PlugskyClient {
  private apiKey: string
  private baseUrl: string
  constructor(opts: { apiKey: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey
    this.baseUrl = (opts.baseUrl ?? "https://api.plugsky.com/v1").replace(/\/$/, "")
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", ...extra }
  }

  private async req<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init)
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new ApiError(`${res.status} ${res.statusText}: ${body.slice(0, 300)}`, res.status)
    }
    return (await res.json()) as T
  }

  async listModels(): Promise<Array<{ id: string }>> {
    const data = await this.req<{ data: Array<{ id: string }> }>("/models", {
      method: "GET",
      headers: this.headers(),
    })
    return data.data ?? []
  }

  async *chatStream(opts: ChatOptions): AsyncGenerator<StreamEvent> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers({ Accept: "text/event-stream" }),
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        tools: opts.tools,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.max_tokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
    })
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "")
      throw new ApiError(`${res.status}: ${body.slice(0, 300)}`, res.status)
    }
    const toolAcc = new Map<number, ToolCall>()
    for await (const data of parseSSE(res.body)) {
      if (data === "[DONE]") { yield { type: "done", finishReason: "stop" }; return }
      const json = JSON.parse(data)
      if (json.usage) yield { type: "usage", usage: json.usage }
      const choice = json.choices?.[0]
      if (!choice) continue
      const delta = choice.delta ?? {}
      if (delta.content) yield { type: "text", delta: delta.content }
      for (const tc of delta.tool_calls ?? []) {
        const idx = tc.index ?? 0
        const acc = toolAcc.get(idx) ?? { id: "", type: "function", function: { name: "", arguments: "" } }
        if (tc.id) acc.id = tc.id
        if (tc.function?.name) acc.function.name = tc.function.name
        if (tc.function?.arguments) acc.function.arguments += tc.function.arguments
        toolAcc.set(idx, acc)
      }
      if (choice.finish_reason) {
        for (const call of toolAcc.values()) yield { type: "tool_call", call }
        toolAcc.clear()
        yield { type: "done", finishReason: choice.finish_reason }
      }
    }
  }

  async completion(model: string, prompt: string, maxTokens = 256): Promise<string> {
    const d = await this.req<{ choices: Array<{ text: string }> }>("/completions", {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model, prompt, max_tokens: maxTokens }),
    })
    return d.choices?.[0]?.text ?? ""
  }

  async generateImage(args: { model?: string; prompt: string; n?: number; size?: string }) {
    return this.req<{ data: Array<{ url?: string; b64_json?: string }> }>("/images/generations", {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model: args.model ?? "black-forest-labs/flux-schnell", prompt: args.prompt, n: args.n ?? 1, size: args.size ?? "1024x1024" }),
    })
  }

  async transcribe(file: Blob, model = "whisper-large-v3", language?: string): Promise<string> {
    const form = new FormData()
    form.append("file", file)
    form.append("model", model)
    if (language) form.append("language", language)
    const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form,
    })
    if (!res.ok) throw new ApiError(`${res.status}`, res.status)
    return ((await res.json()) as { text: string }).text
  }

  async speech(args: { model?: string; input: string; voice?: string; format?: string }): Promise<ArrayBuffer> {
    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model: args.model ?? "magpie-tts-multilingual", input: args.input, voice: args.voice ?? "default", response_format: args.format ?? "mp3" }),
    })
    if (!res.ok) throw new ApiError(`${res.status}`, res.status)
    return res.arrayBuffer()
  }

  async moderate(input: string) {
    return this.req<{ results: Array<{ flagged: boolean; categories: Record<string, boolean> }> }>("/moderations", {
      method: "POST", headers: this.headers(), body: JSON.stringify({ input }),
    })
  }

  async uploadFile(file: Blob, purpose = "assistants") {
    const form = new FormData()
    form.append("file", file)
    form.append("purpose", purpose)
    const res = await fetch(`${this.baseUrl}/files`, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form })
    if (!res.ok) throw new ApiError(`${res.status}`, res.status)
    return res.json()
  }
  async listFiles() { return this.req("/files", { method: "GET", headers: this.headers() }) }

  async createBatch(inputFileId: string, endpoint = "/v1/chat/completions") {
    return this.req("/batches", { method: "POST", headers: this.headers(), body: JSON.stringify({ input_file_id: inputFileId, endpoint, completion_window: "24h" }) })
  }

  async listFineTunes() { return this.req("/fine_tuning/jobs", { method: "GET", headers: this.headers() }) }

  async listAssistants() { return this.req("/assistants", { method: "GET", headers: this.headers() }) }

  async responses(model: string, input: string) {
    return this.req("/responses", { method: "POST", headers: this.headers(), body: JSON.stringify({ model, input }) })
  }

  async usage(params: { start_date?: string; end_date?: string; group_by?: string } = {}) {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    return this.req<{ data: Array<Record<string, unknown>> }>(`/plugsky/usage?${q}`, { method: "GET", headers: this.headers() })
  }

  async route(args: { messages: ChatMessage[]; model?: string }) {
    return this.req<{ plugsky_routing?: { selected_model: string } } & Record<string, unknown>>("/plugsky/route", {
      method: "POST", headers: this.headers(),
      body: JSON.stringify({ model: args.model ?? "auto", messages: args.messages }),
    })
  }

  async embed(input: string[], model = "nvidia/nv-embed-v1"): Promise<number[][]> {
    const d = await this.req<{ data: Array<{ embedding: number[] }> }>("/embeddings", {
      method: "POST", headers: this.headers(), body: JSON.stringify({ model, input }),
    })
    return d.data.map((x) => x.embedding)
  }
}
