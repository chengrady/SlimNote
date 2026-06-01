import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/components/WorkspaceSidebar.vue', import.meta.url), 'utf8')

describe('workspace header actions', () => {
  it('keeps collapse all visible and moves create and refresh actions into the more menu', () => {
    const headerStart = source.indexOf('<div class="group-actions">')
    const headerEnd = source.indexOf('</div>', source.indexOf('@click.stop="showWorkspaceRootMenuFromButton"', headerStart))
    const headerSource = source.slice(headerStart, headerEnd)
    const rootMenuStart = source.indexOf('<template v-if="contextMenu.node?.isRoot">')
    const rootMenuEnd = source.indexOf('</template>', rootMenuStart)
    const rootMenuSource = source.slice(rootMenuStart, rootMenuEnd)

    assert.ok(headerStart >= 0)
    assert.ok(headerEnd > headerStart)
    assert.doesNotMatch(headerSource, /@click\.stop="createWorkspaceFile\(\)"/)
    assert.doesNotMatch(headerSource, /@click\.stop="createWorkspaceFolder\(\)"/)
    assert.doesNotMatch(headerSource, /@click\.stop="refreshWorkspace"/)
    assert.match(headerSource, /@click\.stop="collapseWorkspaceTree"/)
    assert.match(headerSource, /@click\.stop="showWorkspaceRootMenuFromButton"/)
    assert.match(rootMenuSource, /handleContextAction\('workspace-create-file'\)/)
    assert.match(rootMenuSource, /handleContextAction\('workspace-create-folder'\)/)
    assert.match(rootMenuSource, /handleContextAction\('workspace-refresh'\)/)
    assert.doesNotMatch(rootMenuSource, /handleContextAction\('workspace-collapse-all'\)/)
  })
})
