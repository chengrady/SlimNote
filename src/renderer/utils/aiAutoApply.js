import { canApplyAiEdits } from './aiContext.js'

export const FREEFORM_EDIT_ACTION_ID = 'freeform-edit'

const EDIT_INTENT_PATTERN = /(帮我|请|直接|把|将|给我|please|can you|could you|make|turn|rewrite|revise|polish|expand|extend|format|clean up|improve|translate|convert).*(扩写|扩充|续写|润色|优化|改写|重写|整理|格式化|修正|修复|翻译|转换|缩写|精简|压缩|改成|变成|到\d+\s*字|至\d+\s*字|expand|extend|polish|rewrite|revise|format|clean up|improve|translate|convert|shorten|summarize|make)/i
const CHINESE_EDIT_VERB_PATTERN = /(扩写|扩充|续写|润色|优化|改写|重写|整理|格式化|修正|修复|翻译|转换|缩写|精简|压缩|改成|变成|到\d+\s*字|至\d+\s*字)/
const DOCUMENT_TARGET_PATTERN = /(当前文档|当前文件|全文|整篇|整份|这篇文档|这篇文章|本文|文档|文件|全部内容|current document|current file|whole document|entire document|full document|this document|this file)/i
const SELECTION_TARGET_PATTERN = /(选区|选中|选中的|选中文本|这段|这一段|此段|selected text|selection|selected paragraph|this paragraph)/i
const QUESTION_PATTERN = /^(怎么|如何|怎样|能不能|可以吗|是否|为什么|what\b|how\b|why\b|can\b|could\b|should\b)/i

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function hasEditIntent(text) {
  return EDIT_INTENT_PATTERN.test(text) || CHINESE_EDIT_VERB_PATTERN.test(text)
}

function isLikelyQuestionOnly(text) {
  return QUESTION_PATTERN.test(text) && !/(帮我|请|直接|把|将|please|rewrite|polish|expand|format|translate|convert)/i.test(text)
}

export function resolveAiAutoApplyIntent({ userInput = '', actionId = '', activeTab = null, selectionText = '' } = {}) {
  const input = normalizeText(userInput)
  const selectedText = normalizeText(selectionText)
  if (!input || actionId || !activeTab || !canApplyAiEdits(activeTab.language)) return null
  if (!hasEditIntent(input) || isLikelyQuestionOnly(input)) return null

  const targetsSelection = SELECTION_TARGET_PATTERN.test(input)
  const targetsDocument = DOCUMENT_TARGET_PATTERN.test(input)
  const action = selectedText && (targetsSelection || !targetsDocument) ? 'replace-selection' : (targetsDocument || !selectedText ? 'replace-document' : '')
  if (!action) return null

  return {
    action,
    actionId: FREEFORM_EDIT_ACTION_ID,
    tabId: activeTab.id || '',
    selectionText: selectedText
  }
}
