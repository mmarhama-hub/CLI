import { z } from "zod"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname, resolve, relative } from "node:path"
import fg from "fast-glob"
import { createTwoFilesPatch } from "diff"
import type { Tool } from "./types"
import { gate } from "./approval"

function safeResolve(cwd: string, p: string): string {
  const abs = resolve(cwd, p)
  if (relative(cwd, abs).startsWith("..")) throw new Error(`Path escapes project root: ${p}`)
  return abs
}

export const readFileTool: Tool<{ path: string }> = {
  name: "read_file",
  description: "Read a UTF-8 text file within the project. Returns its contents.",
  mutating: false,
  schema: z.object({ path: z.string() }),
  jsonSchema: { type: "object", properties: { path: { type: "string", description: "Relative file path" } }, required: ["path"] },
  async run({ path }, ctx) {
    const abs = safeResolve(ctx.cwd, path)
    if (!existsSync(abs)) return `ERROR: file not found: ${path}`
    const text = readFileSync(abs, "utf8")
    return text.length > 100_000 ? text.slice(0, 100_000) + "\n...[truncated]" : text
  },
}

export const writeFileTool: Tool<{ path: string; content: string }> = {
  name: "write_file",
  description: "Create or overwrite a file with the given content.",
  mutating: true,
  schema: z.object({ path: z.string(), content: z.string() }),
  jsonSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
  async run({ path, content }, ctx) {
    const abs = safeResolve(ctx.cwd, path)
    const before = existsSync(abs) ? readFileSync(abs, "utf8") : ""
    const patch = createTwoFilesPatch(path, path, before, content)
    const ok = await gate(ctx, true, `Write ${path} (${content.length} bytes)`, patch)
    if (!ok) return "SKIPPED: user declined the write."
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, "utf8")
    return `OK: wrote ${path}`
  },
}

export const editFileTool: Tool<{ path: string; old_string: string; new_string: string; replace_all?: boolean }> = {
  name: "edit_file",
  description: "Replace an exact string in a file. old_string must be unique unless replace_all is true.",
  mutating: true,
  schema: z.object({ path: z.string(), old_string: z.string(), new_string: z.string(), replace_all: z.boolean().optional() }),
  jsonSchema: { type: "object", properties: { path: { type: "string" }, old_string: { type: "string" }, new_string: { type: "string" }, replace_all: { type: "boolean" } }, required: ["path", "old_string", "new_string"] },
  async run({ path, old_string, new_string, replace_all }, ctx) {
    const abs = safeResolve(ctx.cwd, path)
    if (!existsSync(abs)) return `ERROR: file not found: ${path}`
    const before = readFileSync(abs, "utf8")
    const count = before.split(old_string).length - 1
    if (count === 0) return "ERROR: old_string not found."
    if (count > 1 && !replace_all) return `ERROR: old_string found ${count} times; set replace_all or make it unique.`
    const after = before.split(old_string).join(new_string)
    const patch = createTwoFilesPatch(path, path, before, after)
    const ok = await gate(ctx, true, `Edit ${path}`, patch)
    if (!ok) return "SKIPPED: user declined the edit."
    writeFileSync(abs, after, "utf8")
    return `OK: edited ${path} (${count} replacement${count > 1 ? "s" : ""})`
  },
}

export const globTool: Tool<{ pattern: string }> = {
  name: "glob",
  description: "Find files matching a glob pattern (e.g. src/**/*.ts).",
  mutating: false,
  schema: z.object({ pattern: z.string() }),
  jsonSchema: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
  async run({ pattern }, ctx) {
    const files = await fg(pattern, { cwd: ctx.cwd, dot: false, ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"] })
    return files.slice(0, 500).join("\n") || "(no matches)"
  },
}

export const grepTool: Tool<{ pattern: string; path?: string }> = {
  name: "grep",
  description: "Search file contents with ripgrep-style regex. Returns matching lines with file:line.",
  mutating: false,
  schema: z.object({ pattern: z.string(), path: z.string().optional() }),
  jsonSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] },
  async run({ pattern, path }, ctx) {
    const target = path ? join(ctx.cwd, path) : ctx.cwd
    const hasRg = Bun.which("rg")
    if (hasRg) {
      const proc = Bun.spawn(["rg", "--line-number", "--no-heading", "--max-count", "200", pattern, target], { stdout: "pipe", stderr: "pipe" })
      const out = await new Response(proc.stdout).text()
      await proc.exited
      return (out || "(no matches)").split("\n").slice(0, 300).join("\n")
    }
    const files = await fg("**/*", { cwd: target, dot: false, ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"], absolute: false })
    const matches: string[] = []
    const re = new RegExp(pattern, "i")
    for (const rel of files.slice(0, 2000)) {
      try {
        const abs = join(target, rel)
        const text = readFileSync(abs, "utf8")
        const lines = text.split("\n")
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i]!)) matches.push(`${rel}:${i + 1}:${lines[i]!.slice(0, 200)}`)
          if (matches.length >= 200) break
        }
      } catch {}
      if (matches.length >= 200) break
    }
    return matches.length ? matches.join("\n") : "(no matches)"
  },
}
