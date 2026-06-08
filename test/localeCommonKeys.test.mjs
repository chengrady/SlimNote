import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const rendererRoot = fileURLToPath(new URL('../src/renderer', import.meta.url))
const localeFiles = {
  'zh-CN': JSON.parse(readFileSync(new URL('../src/renderer/locales/zh-CN.json', import.meta.url), 'utf8')),
  'en-US': JSON.parse(readFileSync(new URL('../src/renderer/locales/en-US.json', import.meta.url), 'utf8'))
}

function collectSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = join(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(entryPath)
    if (entry.isFile() && /\.(js|vue)$/.test(entry.name)) return [entryPath]
    return []
  })
}

function collectUsedCommonKeys() {
  const keys = new Set()
  const commonKeyPattern = /t\(\s*['"`]common\.([A-Za-z0-9_-]+)['"`]/g
  for (const filePath of collectSourceFiles(rendererRoot)) {
    const source = readFileSync(filePath, 'utf8')
    for (const match of source.matchAll(commonKeyPattern)) keys.add(match[1])
  }
  return [...keys].sort()
}

describe('common locale keys', () => {
  it('defines every common key used by renderer components', () => {
    const usedKeys = collectUsedCommonKeys()
    assert.ok(usedKeys.length > 0, 'Expected renderer components to use common locale keys')

    for (const [locale, messages] of Object.entries(localeFiles)) {
      for (const key of usedKeys) {
        assert.ok(messages.common?.[key], `${locale} is missing common.${key}`)
      }
    }
  })

  it('localizes the shared copy action', () => {
    assert.equal(localeFiles['zh-CN'].common.copy, '\u590d\u5236')
    assert.equal(localeFiles['en-US'].common.copy, 'Copy')
  })
})
