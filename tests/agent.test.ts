import { test, expect } from "bun:test"
import { Orchestrator } from "../src/agent/orchestrator"
import { ToolRegistry } from "../src/tools/registry"
import { z } from "zod"

function fakeClient() {
  let turn = 0
  return {
    async *chatStream() {
      if (turn++ === 0) {
        yield { type: "tool_call", call: { id: "1", type: "function", function: { name: "echo", arguments: '{"msg":"hi"}' } } }
        yield { type: "done", finishReason: "tool_calls" }
      } else {
        yield { type: "text", delta: "done: hi" }
        yield { type: "done", finishReason: "stop" }
      }
    },
  } as never
}

test("orchestrator executes tools then finalizes", async () => {
  const reg = new ToolRegistry([{
    name: "echo", description: "echo", mutating: false,
    schema: z.object({ msg: z.string() }), jsonSchema: { type: "object", properties: { msg: { type: "string" } } },
    run: async ({ msg }) => `echo:${msg}`,
  }])
  const orch = new Orchestrator(fakeClient(), reg)
  const { finalText } = await orch.run({
    model: "auto", messages: [{ role: "user", content: "go" }], maxTurns: 5, temperature: 0,
    toolCtx: { cwd: ".", approvalMode: "full-auto", requestApproval: async () => true },
  })
  expect(finalText).toBe("done: hi")
})
