import { test, expect } from "bun:test"
import { bashTool } from "../src/tools/bash"
import { tmpdir } from "node:os"

const ctx = { cwd: tmpdir(), approvalMode: "full-auto" as const, requestApproval: async () => true }

test("bash runs a command and returns output", async () => {
  const res = await bashTool.run({ command: "echo hello" }, ctx)
  expect(res).toContain("hello")
  expect(res).toContain("exit=0")
})

test("bash returns exit code on failure", async () => {
  const res = await bashTool.run({ command: "false" }, ctx)
  expect(res).toContain("exit=1")
})

test("bash blocks destructive patterns", async () => {
  const res = await bashTool.run({ command: "rm -rf /" }, ctx)
  expect(res).toContain("BLOCKED")
})

test("bash blocks mkfs", async () => {
  const res = await bashTool.run({ command: "mkfs.ext4 /dev/sda1" }, ctx)
  expect(res).toContain("BLOCKED")
})

test("bash blocks fork bomb", async () => {
  const res = await bashTool.run({ command: ":(){ :|:& };:" }, ctx)
  expect(res).toContain("BLOCKED")
})

test("bash prompts user in suggest mode", async () => {
  let prompted = false
  const res = await bashTool.run({ command: "echo hi" }, {
    cwd: tmpdir(), approvalMode: "suggest" as const,
    requestApproval: async () => { prompted = true; return true },
  })
  expect(prompted).toBe(true)
  expect(res).toContain("hi")
})

test("bash skips when user declines", async () => {
  const res = await bashTool.run({ command: "echo hi" }, {
    cwd: tmpdir(), approvalMode: "suggest" as const,
    requestApproval: async () => false,
  })
  expect(res).toContain("SKIPPED")
})
