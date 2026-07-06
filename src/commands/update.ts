import pc from "picocolors"
export async function updateCommand(_argv?: string[]): Promise<void> {
  const proc = Bun.spawn(["bash", "-lc", "curl -fsSL https://plugsky.com/install | bash"], { stdout: "inherit", stderr: "inherit" })
  const code = await proc.exited
  console.log(code === 0 ? pc.green("✓ Updated.") : pc.red("Update failed."))
}
