/**
 * Auditoria Lighthouse reproduzível.
 * Uso: npm run lighthouse  (faz o build, sobe o preview e audita)
 *
 * - 3 execuções por página e perfil (mobile/desktop); reporta a mediana.
 * - Salva HTML/JSON de cada execução, summary.json e summary.md com
 *   versões, ambiente e condições (throttling) da execução.
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import config from './lighthouse.config.mjs'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, config.outputDir)
const baseUrl = `http://localhost:${config.port}`

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* servidor subindo */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Servidor não respondeu: ${url}`)
}

function startPreview() {
  const child = spawn('npx', ['vite', 'preview', '--port', String(config.port), '--strictPort'], {
    cwd: root,
    shell: true,
    stdio: 'ignore',
  })
  return child
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const preview = startPreview()
  try {
    await waitFor(baseUrl)
    const chromePath = process.env.CHROME_PATH ?? chromium.executablePath()
    const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] })
    const pkg = JSON.parse(await readFile(path.join(root, 'node_modules/lighthouse/package.json'), 'utf8'))
    const results = []
    let environment = null

    try {
      for (const page of config.pages) {
        for (const profile of config.profiles) {
          const runs = []
          for (let run = 1; run <= config.runs; run++) {
            const result = await lighthouse(
              `${baseUrl}${page.path}`,
              { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: config.categories },
              profile === 'desktop' ? desktopConfig : undefined,
            )
            const name = `${page.id}-${profile}-run${run}`
            await writeFile(path.join(outDir, `${name}.html`), result.report[0])
            await writeFile(path.join(outDir, `${name}.json`), result.report[1])
            const lhr = result.lhr
            environment ??= {
              lighthouseVersion: lhr.lighthouseVersion,
              userAgent: lhr.environment.hostUserAgent,
              benchmarkIndex: lhr.environment.benchmarkIndex,
            }
            runs.push({
              scores: Object.fromEntries(config.categories.map((c) => [c, Math.round(lhr.categories[c].score * 100)])),
              lcpMs: lhr.audits['largest-contentful-paint'].numericValue,
              cls: lhr.audits['cumulative-layout-shift'].numericValue,
              tbtMs: lhr.audits['total-blocking-time'].numericValue,
              throttling: lhr.configSettings.throttling,
              formFactor: lhr.configSettings.formFactor,
            })
            console.log(`${name}:`, runs.at(-1).scores)
          }
          results.push({
            page: page.id,
            path: page.path,
            profile,
            median: {
              ...Object.fromEntries(config.categories.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
              lcpMs: Math.round(median(runs.map((r) => r.lcpMs))),
              cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
              tbtMs: Math.round(median(runs.map((r) => r.tbtMs))),
            },
            throttling: runs[0].throttling,
            runs,
          })
        }
      }
    } finally {
      await chrome.kill()
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      targets: config.targets,
      runsPerPage: config.runs,
      scenario: 'default (MSW, VITE_ENABLE_MOCKS=true)',
      tools: { lighthouse: pkg.version, node: process.version, chrome: chromePath },
      host: { platform: `${os.type()} ${os.release()} (${os.arch()})`, cpus: os.cpus()[0]?.model, cores: os.cpus().length },
      environment,
      results,
    }
    await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
    await writeFile(path.join(outDir, 'summary.md'), toMarkdown(summary))
    console.log(`\nRelatórios em ${config.outputDir}/ (summary.md)`)
  } finally {
    preview.kill()
  }
}

function toMarkdown(summary) {
  const cats = config.categories
  const mark = (cat, v) => (v >= summary.targets[cat] ? `${v}` : `**${v}** ⚠️`)
  const rows = summary.results
    .map((r) => `| ${r.page} | ${r.profile} | ${cats.map((c) => mark(c, r.median[c])).join(' | ')} | ${r.median.lcpMs} ms | ${r.median.cls} | ${r.median.tbtMs} ms |`)
    .join('\n')
  return `# Auditoria Lighthouse (mediana de ${summary.runsPerPage} execuções)

Gerado em ${summary.generatedAt} · Lighthouse ${summary.tools.lighthouse} · Node ${summary.tools.node}
Host: ${summary.host.platform} · ${summary.host.cpus} (${summary.host.cores} núcleos) · BenchmarkIndex ${summary.environment?.benchmarkIndex}
Cenário: ${summary.scenario}

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

Metas: Performance ≥ ${summary.targets.performance}, Acessibilidade ≥ ${summary.targets.accessibility}, Boas práticas ≥ ${summary.targets['best-practices']}, SEO ≥ ${summary.targets.seo}.
Condições: perfil mobile = throttling simulado padrão do Lighthouse (Moto G Power, 4G lento, CPU 4x); desktop = desktop-config (sem throttling de CPU, rede cabeada).
`
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
