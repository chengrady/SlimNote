import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  enhanceMarkdownHtml,
  preprocessMarkdownContent
} from '../src/renderer/utils/markdownRenderer.js'

const sanitizerSource = readFileSync(new URL('../src/renderer/utils/htmlSanitizer.js', import.meta.url), 'utf8')

describe('markdown renderer enhancements', () => {
  it('removes YAML front matter before markdown parsing', () => {
    const result = preprocessMarkdownContent('---\ntitle: Markdown 测试文档\ntags:\n  - test\n---\n\n# 正文标题')

    assert.equal(result.includes('title: Markdown 测试文档'), false)
    assert.equal(result.trim(), '# 正文标题')
  })

  it('converts footnote references and definitions to preview HTML', () => {
    const result = preprocessMarkdownContent('正文有脚注。[^note]\n\n[^note]: 这是脚注内容。')

    assert.match(result, /<sup[^>]*class="footnote-ref"[\s\S]*id="fnref-note"/)
    assert.match(result, /<div class="footnotes"/)
    assert.match(result, /<li id="fn-note">这是脚注内容。/)
    assert.doesNotMatch(result, /\[\^note\]:/)
  })

  it('converts definition lists to HTML definition lists', () => {
    const result = preprocessMarkdownContent('Markdown\n: 一种轻量级标记语言。\n\nGFM\n: GitHub Flavored Markdown。')

    assert.match(result, /<dl>/)
    assert.match(result, /<dt>Markdown<\/dt>/)
    assert.match(result, /<dd>一种轻量级标记语言。<\/dd>/)
    assert.match(result, /<dt>GFM<\/dt>/)
  })

  it('renders inline and block math with KaTeX markup', () => {
    const result = preprocessMarkdownContent('行内公式：$E = mc^2$\n\n$$\n\\sum_{i=1}^{n} i\n$$')

    assert.match(result, /class="katex/)
    assert.doesNotMatch(result, /\$E = mc\^2\$/)
    assert.doesNotMatch(result, /\$\$/)
  })

  it('enhances GitHub alert blockquotes after markdown parsing', () => {
    const result = enhanceMarkdownHtml('<blockquote><p>[!WARNING]<br>这是 WARNING。</p></blockquote>')

    assert.match(result, /class="markdown-alert markdown-alert-warning"/)
    assert.match(result, /<p class="markdown-alert-title">WARNING<\/p>/)
    assert.doesNotMatch(result, /\[!WARNING\]/)
  })

  it('converts markdown container blocks to preview HTML', () => {
    const result = preprocessMarkdownContent('::: info\n这是 info 容器。\n:::\n\n::: warning\n这是 warning 容器。\n:::')

    assert.match(result, /class="markdown-container markdown-container-info"/)
    assert.match(result, /class="markdown-container markdown-container-warning"/)
    assert.doesNotMatch(result, /::: info/)
    assert.doesNotMatch(result, /::: warning/)
  })

  it('keeps http image sources and mark tags in sanitized output', () => {
    const result = enhanceMarkdownHtml('<p><img src="http://example.com/a.png" alt="HTTP"><mark>高亮</mark></p>')

    assert.match(result, /src="http:\/\/example\.com\/a\.png"/)
    assert.match(result, /referrerpolicy="no-referrer"/)
    assert.match(result, /<mark>高亮<\/mark>/)
  })

  it('preserves an explicit image referrer policy when one is already present', () => {
    const result = enhanceMarkdownHtml('<p><img src="http://example.com/a.png" alt="HTTP" referrerpolicy="origin"></p>')

    assert.match(result, /referrerpolicy="origin"/)
    assert.doesNotMatch(result, /referrerpolicy="origin" referrerpolicy="no-referrer"/)
  })

  it('keeps sanitizer allowlist safe for mark and image protocols', () => {
    assert.match(sanitizerSource, /'mark'/)
    assert.match(sanitizerSource, /const SAFE_SRC_PROTOCOLS = new Set\(\['http:', 'https:', 'file:'\]\)/)
    assert.match(sanitizerSource, /if \(name === 'src' && !isSafeUrl\(value, SAFE_SRC_PROTOCOLS/)
    assert.match(sanitizerSource, /img: new Set\(\['alt', 'height', 'loading', 'referrerpolicy', 'src', 'width'\]\)/)
  })

  it('forwards MarkdownPreview attributes to its root element without Vue warnings', () => {
    const source = readFileSync(new URL('../src/renderer/components/MarkdownPreview.vue', import.meta.url), 'utf8')
    const editorPanelSource = readFileSync(new URL('../src/renderer/components/EditorPanel.vue', import.meta.url), 'utf8')

    assert.match(source, /defineOptions\(\{\s*inheritAttrs:\s*false\s*\}\)/)
    assert.match(source, /const attrs = useAttrs\(\)/)
    assert.match(source, /v-bind="attrs"/)
    assert.doesNotMatch(editorPanelSource, /class="context-markdown-preview"/)
  })
})
