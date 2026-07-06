import { test, expect } from "bun:test"
import { gate } from "../src/tools/approval"

const baseCtx = { cwd: ".", approvalMode: "suggest" as const, requestApproval: async () => true }

test("gate allows non-mutating tools", async () => {
  expect(await gate(baseCtx, false, "read")).toBe(true)
})

test("gate blocks mutating in suggest mode", async () => {
  const ctx = { ...baseCtx, requestApproval: async () => false }
  expect(await gate(ctx, true, "write")).toBe(false)
})

test("gate allows mutating in full-auto", async () => {
  expect(await gate({ ...baseCtx, approvalMode: "full-auto" }, true, "write")).toBe(true)
})

test("gate allows mutating in auto-edit", async () => {
  expect(await gate({ ...baseCtx, approvalMode: "auto-edit" }, true, "edit")).toBe(true)
})

test("gate calls requestApproval in suggest mode", async () => {
  let called = false
  await gate({ ...baseCtx, requestApproval: async () => { called = true; return true } }, true, "write")
  expect(called).toBe(true)
})
