#!/usr/bin/env bun
import { runRouter } from "./router"

runRouter(process.argv.slice(2)).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`\nplugsky: ${msg}\n`)
  process.exit(1)
})
