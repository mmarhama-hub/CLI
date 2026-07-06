import pc from "picocolors"

export type LogLevel = "debug" | "info" | "warn" | "error"
const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

let current: LogLevel = (process.env.PLUGSKY_LOG as LogLevel) ?? "info"
export const setLogLevel = (l: LogLevel) => (current = l)

function emit(level: LogLevel, args: unknown[]) {
  if (order[level] < order[current]) return
  const tag = {
    debug: pc.dim("debug"),
    info: pc.blue("info"),
    warn: pc.yellow("warn"),
    error: pc.red("error"),
  }[level]
  process.stderr.write(`${pc.dim("plugsky")} ${tag} ${args.join(" ")}\n`)
}

export const log = {
  debug: (...a: unknown[]) => emit("debug", a),
  info: (...a: unknown[]) => emit("info", a),
  warn: (...a: unknown[]) => emit("warn", a),
  error: (...a: unknown[]) => emit("error", a),
}
