import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
const bundle = path.join(root, 'src-tauri/target/aarch64-apple-darwin/release/bundle')
const output = path.join(root, 'release/tauri-arm64')
await fs.mkdir(output, { recursive: true })
const app = path.join(output, 'Markdown Open.app')
await fs.rm(app, { recursive: true, force: true })
await fs.cp(path.join(bundle, 'macos/Markdown Open.app'), app, { recursive: true, verbatimSymlinks: true })
const dmgName = (await fs.readdir(path.join(bundle, 'dmg'))).find(name => name.endsWith('.dmg'))
if (!dmgName) throw new Error('Tauri did not produce a DMG.')
const dmg = path.join(output, `Markdown Open-${pkg.version}-arm64.dmg`)
const zip = path.join(output, `Markdown Open-${pkg.version}-arm64-mac.zip`)
await fs.copyFile(path.join(bundle, 'dmg', dmgName), dmg)
await fs.rm(zip, { force: true })
execFileSync('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, zip])
async function size(location) {
  const stat = await fs.lstat(location)
  if (!stat.isDirectory()) return stat.size
  const sizes = await Promise.all((await fs.readdir(location)).map(name => size(path.join(location, name))))
  return sizes.reduce((sum, item) => sum + item, 0)
}
const baseline = JSON.parse(await fs.readFile(path.join(root, 'docs/electron-size-baseline.json'), 'utf8'))
const report = {
  architecture: 'arm64', version: pkg.version,
  baseline,
  tauri: { dmgBytes: await size(dmg), zipBytes: await size(zip), appBytes: await size(app) },
}
report.dmgReductionPercent = Number(((1 - report.tauri.dmgBytes / baseline.dmgBytes) * 100).toFixed(2))
report.meetsDmgTarget = report.dmgReductionPercent >= 50
await fs.writeFile(path.join(root, 'docs/tauri-size-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
console.log(`Artifacts: ${output}`)
if (!report.meetsDmgTarget) process.exitCode = 1
