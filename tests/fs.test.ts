import { test, expect } from "bun:test"
import { editFileTool, readFileTool, writeFileTool } from "../src/tools/fs"
import { writeFileSync, mkdtempSync, readFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const ctx = { cwd: tmpdir(), approvalMode: "full-auto" as const, requestApproval: async () => true }

test("edit_file replaces unique string", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  writeFileSync(join(dir, "a.txt"), "hello world")
  const res = await editFileTool.run(
    { path: "a.txt", old_string: "world", new_string: "plugsky" },
    { ...ctx, cwd: dir },
  )
  expect(res).toContain("OK")
  expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("hello plugsky")
})

test("edit_file $ in replacement does not corrupt", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  writeFileSync(join(dir, "a.txt"), "hello world")
  await editFileTool.run(
    { path: "a.txt", old_string: "world", new_string: "$PATH &1 $2 $$" },
    { ...ctx, cwd: dir },
  )
  expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("hello $PATH &1 $2 $$")
})

test("edit_file replace_all works", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  writeFileSync(join(dir, "a.txt"), "foo foo foo")
  await editFileTool.run(
    { path: "a.txt", old_string: "foo", new_string: "bar", replace_all: true },
    { ...ctx, cwd: dir },
  )
  expect(readFileSync(join(dir, "a.txt"), "utf8")).toBe("bar bar bar")
})

test("edit_file returns error on missing string", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  writeFileSync(join(dir, "a.txt"), "hello")
  const res = await editFileTool.run(
    { path: "a.txt", old_string: "nope", new_string: "x" },
    { ...ctx, cwd: dir },
  )
  expect(res).toContain("ERROR")
})

test("edit_file returns error on multiple matches without replace_all", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  writeFileSync(join(dir, "a.txt"), "a a a")
  const res = await editFileTool.run(
    { path: "a.txt", old_string: "a", new_string: "b" },
    { ...ctx, cwd: dir },
  )
  expect(res).toContain("ERROR")
  expect(res).toContain("3 times")
})

test("read_file returns content", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  writeFileSync(join(dir, "test.txt"), "content")
  const res = await readFileTool.run({ path: "test.txt" }, { ...ctx, cwd: dir })
  expect(res).toBe("content")
})

test("read_file returns error for missing file", async () => {
  const res = await readFileTool.run({ path: "nonexistent.txt" }, { ...ctx, cwd: tmpdir() })
  expect(res).toContain("ERROR")
})

test("read_file blocks path traversal", async () => {
  expect(readFileTool.run({ path: "../../etc/passwd" }, { ...ctx, cwd: tmpdir() })).rejects.toThrow("escapes")
})

test("write_file creates file with content", async () => {
  const dir = mkdtempSync(join(tmpdir(), "plugsky-"))
  const res = await writeFileTool.run({ path: "new.txt", content: "hello" }, { ...ctx, cwd: dir })
  expect(res).toContain("OK")
  expect(readFileSync(join(dir, "new.txt"), "utf8")).toBe("hello")
})

test("write_file blocks path traversal", async () => {
  expect(writeFileTool.run({ path: "../../escape.txt", content: "x" }, { ...ctx, cwd: tmpdir() })).rejects.toThrow("escapes")
})
