import { $ } from "bun"

const compile = process.argv.includes("--compile")

await Bun.build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  target: "bun",
  format: "esm",
  minify: true,
  sourcemap: "linked",

})
await $`chmod +x dist/index.js`
console.log("✓ built dist/index.js")

if (compile) {
  const targets = [
    ["bun-linux-x64", "plugsky-linux-x64"],
    ["bun-linux-arm64", "plugsky-linux-arm64"],
    ["bun-darwin-x64", "plugsky-darwin-x64"],
    ["bun-darwin-arm64", "plugsky-darwin-arm64"],
    ["bun-windows-x64", "plugsky-windows-x64.exe"],
  ] as const
  for (const [target, out] of targets) {
    await $`bun build src/index.ts --compile --target=${target} --outfile dist/bin/${out} --minify`
    console.log(`✓ compiled dist/bin/${out}`)
  }
}
