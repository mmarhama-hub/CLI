import { test, expect } from "bun:test"
import { parseSSE } from "../src/util/sse"

test("parseSSE yields data payloads", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode('data: {"a":1}\n\ndata: [DONE]\n\n'))
      c.close()
    },
  })
  const out: string[] = []
  for await (const d of parseSSE(stream)) out.push(d)
  expect(out).toEqual(['{"a":1}', "[DONE]"])
})
