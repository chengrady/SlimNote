import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatMarkdownSourceListBlock, getMarkdownSelectedLineRange } from '../src/renderer/utils/markdownSourceFormat.js'

describe('markdown source multi-line list formatting', () => {
  it('applies unordered list markers to every non-empty selected line', () => {
    const result = formatMarkdownSourceListBlock('alpha\n  beta\n\n3. gamma', 'unordered')

    assert.equal(result.changed, true)
    assert.equal(result.text, '- alpha\n  - beta\n\n- gamma')
  })

  it('renumbers ordered lists across non-empty selected lines', () => {
    const result = formatMarkdownSourceListBlock('- alpha\n\n  - beta\n9. gamma', 'ordered')

    assert.equal(result.changed, true)
    assert.equal(result.text, '1. alpha\n\n  2. beta\n3. gamma')
  })

  it('applies task list markers and preserves checked task state', () => {
    const result = formatMarkdownSourceListBlock('- [x] done\n1. next', 'task')

    assert.equal(result.changed, true)
    assert.equal(result.text, '- [x] done\n- [ ] next')
  })

  it('preserves CRLF line endings while formatting', () => {
    const result = formatMarkdownSourceListBlock('alpha\r\nbeta', 'unordered')

    assert.equal(result.text, '- alpha\r\n- beta')
  })

  it('formats whole selected lines and excludes the next line when selection ends at column one', () => {
    const model = {
      getLineMaxColumn(lineNumber) {
        return lineNumber === 1 ? 6 : 5
      }
    }
    const range = getMarkdownSelectedLineRange({
      startLineNumber: 1,
      startColumn: 3,
      endLineNumber: 3,
      endColumn: 1,
      isEmpty: () => false
    }, model)

    assert.deepEqual(range, {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 5
    })
  })
})
