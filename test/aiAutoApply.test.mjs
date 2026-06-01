import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { FREEFORM_EDIT_ACTION_ID, resolveAiAutoApplyIntent } from '../src/renderer/utils/aiAutoApply.js'
import { buildAiMessages } from '../src/renderer/utils/aiPrompts.js'

const markdownTab = {
  id: 'tab-1',
  title: 'notes.md',
  language: 'markdown',
  content: '今天开会讨论了产品方向。'
}

describe('AI auto apply intent', () => {
  it('auto-applies explicit current-document edit requests to the whole document', () => {
    const intent = resolveAiAutoApplyIntent({
      userInput: '帮我把当前文档扩写到400字',
      activeTab: markdownTab
    })

    assert.equal(intent?.action, 'replace-document')
    assert.equal(intent?.actionId, FREEFORM_EDIT_ACTION_ID)
    assert.equal(intent?.tabId, 'tab-1')
  })

  it('prefers the selected text when the request targets the selection', () => {
    const intent = resolveAiAutoApplyIntent({
      userInput: '请润色选中的内容',
      activeTab: markdownTab,
      selectionText: '今天开会讨论了产品方向。'
    })

    assert.equal(intent?.action, 'replace-selection')
    assert.equal(intent?.selectionText, '今天开会讨论了产品方向。')
  })

  it('does not auto-apply questions or non-editable files', () => {
    assert.equal(resolveAiAutoApplyIntent({ userInput: '怎么润色当前文档？', activeTab: markdownTab }), null)
    assert.equal(resolveAiAutoApplyIntent({ userInput: '帮我格式化当前文档', activeTab: { ...markdownTab, language: 'json' } }), null)
  })

  it('asks the model for directly replaceable text for freeform edits', () => {
    const messages = buildAiMessages({
      actionId: FREEFORM_EDIT_ACTION_ID,
      userInput: '帮我把当前文档扩写到400字',
      context: {
        fileName: 'notes.md',
        language: 'markdown',
        isEditable: true,
        includedParts: ['fileInfo', 'fullDocument'],
        fullDocument: markdownTab.content
      }
    })

    assert.match(messages[0].content, /return only the directly applicable body text/i)
    assert.match(messages[1].content, /complete replacement text/i)
  })
})
