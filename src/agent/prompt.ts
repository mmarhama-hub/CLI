import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

export function buildSystemPrompt(cwd: string): string {
  const parts: string[] = [
    "You are Plugsky, an elite agentic coding assistant running in the user's terminal.",
    "You can read and edit files, run shell commands, and search the codebase using the provided tools.",
    "Principles:",
    "- Prefer small, precise edits (edit_file) over rewriting whole files.",
    "- Before editing, read the relevant files. After editing, run tests/build to verify.",
    "- Explain what you're doing briefly; do not narrate every token.",
    "- Never invent file paths; use glob/grep to discover them.",
    "- Stop when the task is complete and give a short summary.",
    `Working directory: ${cwd}`,
  ]
  for (const f of ["AGENTS.md", "PLUGSKY.md", ".plugsky/instructions.md"]) {
    const p = join(cwd, f)
    if (existsSync(p)) parts.push(`\n--- Project instructions (${f}) ---\n` + readFileSync(p, "utf8").slice(0, 8000))
  }
  return parts.join("\n")
}
