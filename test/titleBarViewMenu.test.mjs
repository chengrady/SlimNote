import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/components/TitleBar.vue', import.meta.url), 'utf8')

describe('title bar view menu', () => {
  it('omits duplicated layout and theme actions from the view menu while keeping toolbar actions', () => {
    const viewMenuStart = source.indexOf("key: 'view'")
    const helpMenuStart = source.indexOf("key: 'help'", viewMenuStart)
    const viewMenuSource = source.slice(viewMenuStart, helpMenuStart)

    assert.ok(viewMenuStart >= 0)
    assert.ok(helpMenuStart > viewMenuStart)
    assert.doesNotMatch(viewMenuSource, /action:\s*'toggle-sidebar'/)
    assert.doesNotMatch(viewMenuSource, /action:\s*'toggle-right-sidebar'/)
    assert.doesNotMatch(viewMenuSource, /action:\s*'toggle-theme'/)
    assert.match(viewMenuSource, /action:\s*'toggle-fullscreen'/)
    assert.match(viewMenuSource, /action:\s*'toggle-presentation-mode'/)
    assert.match(source, /@click="requestMenuAction\('toggle-sidebar'\)"/)
    assert.match(source, /@click="requestMenuAction\('toggle-right-sidebar'\)"/)
  })
})
