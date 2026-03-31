const LANGUAGE_LABELS = {
  plaintext: '纯文本',
  log: '日志',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  json: 'JSON',
  markdown: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  xml: 'XML',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  sql: 'SQL'
}

function countMatches(text, patterns) {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0)
}

function isLikelyJson(text) {
  const trimmed = text.trim()
  if (!trimmed || !/^[\[{]/.test(trimmed)) return false
  try {
    const parsed = JSON.parse(trimmed)
    return parsed !== undefined
  } catch {
    return false
  }
}

function scoreMarkdown(text) {
  const patterns = [
    /^#{1,6}\s+.+/m,
    /^>\s+.+/m,
    /^[-*+]\s+.+/m,
    /^\d+\.\s+.+/m,
    /^```[\w-]*/m,
    /\[[^\]]+\]\([^)]+\)/,
    /!\[[^\]]*\]\([^)]+\)/,
    /^\|.+\|$/m
  ]
  return countMatches(text, patterns)
}

function scoreSql(text) {
  return countMatches(text, [
    /\bselect\b[\s\S]+\bfrom\b/i,
    /\binsert\s+into\b/i,
    /\bupdate\b[\s\S]+\bset\b/i,
    /\bdelete\s+from\b/i,
    /\bcreate\s+(table|index|view|database)\b/i,
    /\bwhere\b/i,
    /;\s*$/m
  ])
}

function scoreHtml(text) {
  return countMatches(text, [
    /<!doctype\s+html>/i,
    /<html[\s>]/i,
    /<head[\s>]/i,
    /<body[\s>]/i,
    /<div[\s>]/i,
    /<script[\s>]/i,
    /<style[\s>]/i
  ])
}

function scoreXml(text) {
  return countMatches(text, [
    /<\?xml\s+version=/i,
    /<([A-Za-z_][\w:.-]*)[^>]*>[\s\S]*<\/\1>/,
    /<([A-Za-z_][\w:.-]*)([^>]*)\/>/
  ])
}

function scoreCss(text) {
  return countMatches(text, [
    /[.#]?[A-Za-z][\w\s>:+~.,#-]*\{[^}]*:[^}]*\}/,
    /@[a-z-]+\s+/i,
    /--[\w-]+\s*:/,
    /\b(color|display|margin|padding|font-size|background)\s*:/i
  ])
}

function scoreScss(text) {
  return countMatches(text, [
    /\$[\w-]+\s*:/,
    /@[a-z-]+\s+/i,
    /&[:.#\[]/,
    /\b(mixin|include|extend)\b/i
  ])
}

function scoreJavaScript(text) {
  return countMatches(text, [
    /\b(const|let|var)\s+[A-Za-z_$][\w$]*\s*=/,
    /\bfunction\s+[A-Za-z_$][\w$]*\s*\(/,
    /=>/,
    /\bimport\b.+\bfrom\b/,
    /\bexport\b\s+(default|const|function|class)/,
    /console\.(log|error|warn)\s*\(/
  ])
}

function scoreTypeScript(text) {
  return countMatches(text, [
    /\binterface\s+[A-Z][\w$]*/,
    /\btype\s+[A-Z][\w$]*\s*=/,
    /\benum\s+[A-Z][\w$]*/,
    /:\s*(string|number|boolean|unknown|any|void|Record<|Array<)/,
    /<[^>]+>\s*\(/,
    /\bas\s+(const|[A-Z][\w$]*)/
  ])
}

function scorePython(text) {
  return countMatches(text, [
    /^def\s+[A-Za-z_][\w]*\s*\(/m,
    /^class\s+[A-Za-z_][\w]*\s*[:(]/m,
    /^import\s+[\w.]+/m,
    /^from\s+[\w.]+\s+import\s+/m,
    /if\s+__name__\s*==\s*['"]__main__['"]\s*:/,
    /:\s*\n\s{2,}\S/m
  ])
}

function scoreLog(text) {
  return countMatches(text, [
    /^\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}/m,
    /^\[?(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)\]?/m,
    /\b(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)\b/m,
    /^\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?/m
  ])
}

export function getLanguageDisplayName(language, fallback = '') {
  return LANGUAGE_LABELS[language] || fallback || language
}

export function detectLanguageFromContent(content = '', currentLanguage = 'plaintext') {
  const text = String(content || '')
  const trimmed = text.trim()

  if (trimmed.length < 12) {
    return { language: null, confidence: 0, reason: '', currentLanguage }
  }

  if (isLikelyJson(trimmed)) {
    return { language: 'json', confidence: 0.98, reason: '识别到合法 JSON 结构', currentLanguage }
  }

  const scores = {
    markdown: scoreMarkdown(trimmed),
    sql: scoreSql(trimmed),
    html: scoreHtml(trimmed),
    xml: scoreXml(trimmed),
    css: scoreCss(trimmed),
    scss: scoreScss(trimmed),
    javascript: scoreJavaScript(trimmed),
    typescript: scoreTypeScript(trimmed),
    python: scorePython(trimmed),
    log: scoreLog(trimmed)
  }

  if (scores.html >= 2 && scores.xml < scores.html) {
    return { language: 'html', confidence: 0.9, reason: '识别到 HTML 标签结构', currentLanguage }
  }

  if (scores.xml >= 2 && scores.html < 2) {
    return { language: 'xml', confidence: 0.88, reason: '识别到 XML 标签结构', currentLanguage }
  }

  if (scores.markdown >= 3) {
    return { language: 'markdown', confidence: 0.9, reason: '识别到标题、列表或链接等 Markdown 语法', currentLanguage }
  }

  if (scores.sql >= 3) {
    return { language: 'sql', confidence: 0.9, reason: '识别到典型 SQL 关键字组合', currentLanguage }
  }

  if (scores.typescript >= 2 && scores.javascript >= 1) {
    return { language: 'typescript', confidence: 0.87, reason: '识别到 TypeScript 类型或接口语法', currentLanguage }
  }

  if (scores.javascript >= 3) {
    return { language: 'javascript', confidence: 0.84, reason: '识别到典型 JavaScript 语法', currentLanguage }
  }

  if (scores.scss >= 2 && scores.css >= 1) {
    return { language: 'scss', confidence: 0.84, reason: '识别到变量、嵌套或 mixin 等 SCSS 语法', currentLanguage }
  }

  if (scores.css >= 3) {
    return { language: 'css', confidence: 0.82, reason: '识别到样式选择器和属性声明', currentLanguage }
  }

  if (scores.python >= 3) {
    return { language: 'python', confidence: 0.82, reason: '识别到 def、import 或缩进代码块', currentLanguage }
  }

  if (scores.log >= 3) {
    return { language: 'log', confidence: 0.8, reason: '识别到时间戳和日志级别', currentLanguage }
  }

  return { language: null, confidence: 0, reason: '', currentLanguage }
}