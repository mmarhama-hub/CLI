export async function confirmTTY(prompt: string): Promise<boolean> {
  process.stdout.write(prompt)
  for await (const line of console) return /^y(es)?$/i.test(line.trim())
  return false
}
