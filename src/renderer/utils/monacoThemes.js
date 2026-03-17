/**
 * Monaco Editor 主题配置
 * 提供多种代码编辑器主题
 */
import * as monaco from 'monaco-editor'

/**
 * 主题配置列表
 */
export const themes = {
  'jsonstudio-dark': {
    name: 'JsonStudio Dark',
    base: 'vs-dark',
    custom: true
  },
  'jsonstudio-light': {
    name: 'JsonStudio Light',
    base: 'vs',
    custom: true
  },
  'vs-dark': {
    name: 'VS Code Dark',
    base: 'vs-dark',
    custom: false
  },
  'vs-light': {
    name: 'VS Code Light',
    base: 'vs',
    custom: false
  },
  'dracula': {
    name: 'Dracula',
    base: 'vs-dark',
    custom: true
  },
  'nord': {
    name: 'Nord',
    base: 'vs-dark',
    custom: true
  },
  'one-dark': {
    name: 'One Dark',
    base: 'vs-dark',
    custom: true
  },
  'one-light': {
    name: 'One Light',
    base: 'vs',
    custom: true
  },
  'solarized-dark': {
    name: 'Solarized Dark',
    base: 'vs-dark',
    custom: true
  },
  'solarized-light': {
    name: 'Solarized Light',
    base: 'vs',
    custom: true
  },
  'monokai': {
    name: 'Monokai',
    base: 'vs-dark',
    custom: true
  },
  'github-dark': {
    name: 'GitHub Dark',
    base: 'vs-dark',
    custom: true
  },
  'github-light': {
    name: 'GitHub Light',
    base: 'vs',
    custom: true
  }
}

/**
 * 定义所有自定义主题
 */
export function defineCustomThemes() {
  // JsonStudio Dark Theme
  monaco.editor.defineTheme('jsonstudio-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '63708b', fontStyle: 'italic' },
      { token: 'string.key.json', foreground: '7dcfff' },
      { token: 'string.value.json', foreground: '9ece6a' },
      { token: 'string', foreground: '9ece6a' },
      { token: 'number.json', foreground: 'ff9e64' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'keyword.json', foreground: 'bb9af7' },
      { token: 'keyword', foreground: 'bb9af7' },
      { token: 'delimiter.bracket.json', foreground: '9aa7bd' },
      { token: 'delimiter.array.json', foreground: '9aa7bd' },
      { token: 'delimiter.colon.json', foreground: '6fb6ff' },
      { token: 'delimiter.comma.json', foreground: '5f6b85' },
    ],
    colors: {
      'editor.background': '#0f1722',
      'editor.foreground': '#d9e1ec',
      'editorLineNumber.foreground': '#516079',
      'editorLineNumber.activeForeground': '#9fb1ca',
      'editorGutter.background': '#0f1722',
      'editor.lineHighlightBackground': '#162033',
      'editor.selectionBackground': '#17365d80',
      'editor.inactiveSelectionBackground': '#17365d4d',
      'editor.wordHighlightBackground': '#1e437459',
      'editor.wordHighlightStrongBackground': '#28568c66',
      'editorCursor.foreground': '#7dcfff',
      'editorWhitespace.foreground': '#283349',
      'editorIndentGuide.background1': '#233047',
      'editorIndentGuide.activeBackground1': '#3e516f',
      'editorBracketMatch.background': '#1c33554d',
      'editorBracketMatch.border': '#5da8ff80',
      'editorBracketHighlight.foreground1': '#7dcfff',
      'editorBracketHighlight.foreground2': '#9ece6a',
      'editorBracketHighlight.foreground3': '#ff9e64',
      'editorBracketHighlight.foreground4': '#bb9af7',
      'editorBracketHighlight.foreground5': '#f7768e',
      'editorBracketHighlight.foreground6': '#e0af68',
      'editorBracketHighlight.unexpectedBracket.foreground': '#f7768e',
      'editor.findMatchBackground': '#275ea84d',
      'editor.findMatchHighlightBackground': '#21406b40',
      'editor.hoverHighlightBackground': '#1a284080',
      'editorWidget.background': '#111a28',
      'editorWidget.border': '#243348',
      'scrollbarSlider.background': '#30415d66',
      'scrollbarSlider.hoverBackground': '#3d537880',
      'scrollbarSlider.activeBackground': '#4b669380'
    }
  })

  // JsonStudio Light Theme
  monaco.editor.defineTheme('jsonstudio-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7f8aa3', fontStyle: 'italic' },
      { token: 'string.key.json', foreground: '0f6ad8' },
      { token: 'string.value.json', foreground: '2f855a' },
      { token: 'string', foreground: '2f855a' },
      { token: 'number.json', foreground: 'c05621' },
      { token: 'number', foreground: 'c05621' },
      { token: 'keyword.json', foreground: '7c3aed' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'delimiter.bracket.json', foreground: '68768a' },
      { token: 'delimiter.array.json', foreground: '68768a' },
      { token: 'delimiter.colon.json', foreground: '1d4ed8' },
      { token: 'delimiter.comma.json', foreground: '9aa7bd' },
    ],
    colors: {
      'editor.background': '#fbfdff',
      'editor.foreground': '#213047',
      'editorLineNumber.foreground': '#9aa7bd',
      'editorLineNumber.activeForeground': '#54657f',
      'editorGutter.background': '#fbfdff',
      'editor.lineHighlightBackground': '#eef4fb',
      'editor.selectionBackground': '#bfdbfe80',
      'editor.inactiveSelectionBackground': '#dbeafe66',
      'editor.wordHighlightBackground': '#d9e9ff80',
      'editor.wordHighlightStrongBackground': '#b7d4ff80',
      'editorCursor.foreground': '#0f6ad8',
      'editorWhitespace.foreground': '#d7e0ec',
      'editorIndentGuide.background1': '#dde6f2',
      'editorIndentGuide.activeBackground1': '#b7c4d8',
      'editorBracketMatch.background': '#d9e9ff80',
      'editorBracketMatch.border': '#60a5fa99',
      'editorBracketHighlight.foreground1': '#0f6ad8',
      'editorBracketHighlight.foreground2': '#2f855a',
      'editorBracketHighlight.foreground3': '#c05621',
      'editorBracketHighlight.foreground4': '#7c3aed',
      'editorBracketHighlight.foreground5': '#e11d48',
      'editorBracketHighlight.foreground6': '#b45309',
      'editorBracketHighlight.unexpectedBracket.foreground': '#e11d48',
      'editor.findMatchBackground': '#93c5fd80',
      'editor.findMatchHighlightBackground': '#dbeafe99',
      'editor.hoverHighlightBackground': '#e7f0fb',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#d7e3f0',
      'scrollbarSlider.background': '#c9d6e566',
      'scrollbarSlider.hoverBackground': '#b4c5da80',
      'scrollbarSlider.activeBackground': '#9fb4cf99'
    }
  })

  // Dracula Theme
  monaco.editor.defineTheme('dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'regexp', foreground: 'f1fa8c' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'class', foreground: '8be9fd' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'variable.predefined', foreground: 'bd93f9' },
      { token: 'constant', foreground: 'bd93f9' },
      { token: 'tag', foreground: 'ff79c6' },
      { token: 'attribute.name', foreground: '50fa7b' },
      { token: 'attribute.value', foreground: 'f1fa8c' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a',
      'editor.selectionBackground': '#44475a',
      'editorCursor.foreground': '#f8f8f0',
      'editorWhitespace.foreground': '#3b3a32',
      'editorIndentGuide.background': '#3b3a32',
      'editorIndentGuide.activeBackground': '#6272a4',
    }
  })

  // Nord Theme
  monaco.editor.defineTheme('nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'regexp', foreground: 'ebcb8b' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'class', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'd8dee9' },
      { token: 'constant', foreground: 'd08770' },
      { token: 'tag', foreground: '81a1c1' },
      { token: 'attribute.name', foreground: '8fbcbb' },
      { token: 'attribute.value', foreground: 'a3be8c' },
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b4252',
      'editor.selectionBackground': '#434c5e',
      'editorCursor.foreground': '#d8dee9',
      'editorWhitespace.foreground': '#4c566a',
      'editorIndentGuide.background': '#4c566a',
      'editorIndentGuide.activeBackground': '#616e88',
    }
  })

  // One Dark Theme
  monaco.editor.defineTheme('one-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'regexp', foreground: '56b6c2' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'class', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'abb2bf' },
      { token: 'constant', foreground: 'd19a66' },
      { token: 'tag', foreground: 'e06c75' },
      { token: 'attribute.name', foreground: 'd19a66' },
      { token: 'attribute.value', foreground: '98c379' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313c',
      'editor.selectionBackground': '#3e4451',
      'editorCursor.foreground': '#528bff',
      'editorWhitespace.foreground': '#3b4048',
      'editorIndentGuide.background': '#3b4048',
      'editorIndentGuide.activeBackground': '#5c6370',
    }
  })

  // One Light Theme
  monaco.editor.defineTheme('one-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'a0a1a7', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'a626a4' },
      { token: 'string', foreground: '50a14f' },
      { token: 'number', foreground: '986801' },
      { token: 'regexp', foreground: '0184bc' },
      { token: 'type', foreground: 'c18401' },
      { token: 'class', foreground: 'c18401' },
      { token: 'function', foreground: '4078f2' },
      { token: 'variable', foreground: '383a42' },
      { token: 'constant', foreground: '986801' },
      { token: 'tag', foreground: 'e45649' },
      { token: 'attribute.name', foreground: '986801' },
      { token: 'attribute.value', foreground: '50a14f' },
    ],
    colors: {
      'editor.background': '#fafafa',
      'editor.foreground': '#383a42',
      'editor.lineHighlightBackground': '#f0f0f0',
      'editor.selectionBackground': '#e5e5e6',
      'editorCursor.foreground': '#526fff',
      'editorWhitespace.foreground': '#d7d7d7',
      'editorIndentGuide.background': '#d7d7d7',
      'editorIndentGuide.activeBackground': '#9d9d9f',
    }
  })

  // Solarized Dark Theme
  monaco.editor.defineTheme('solarized-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'regexp', foreground: 'd30102' },
      { token: 'type', foreground: 'b58900' },
      { token: 'class', foreground: 'b58900' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '839496' },
      { token: 'constant', foreground: 'cb4b16' },
      { token: 'tag', foreground: '268bd2' },
      { token: 'attribute.name', foreground: '93a1a1' },
      { token: 'attribute.value', foreground: '2aa198' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editor.selectionBackground': '#073642',
      'editorCursor.foreground': '#839496',
      'editorWhitespace.foreground': '#073642',
      'editorIndentGuide.background': '#073642',
      'editorIndentGuide.activeBackground': '#586e75',
    }
  })

  // Solarized Light Theme
  monaco.editor.defineTheme('solarized-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '93a1a1', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'string', foreground: '2aa198' },
      { token: 'number', foreground: 'd33682' },
      { token: 'regexp', foreground: 'd30102' },
      { token: 'type', foreground: 'b58900' },
      { token: 'class', foreground: 'b58900' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '657b83' },
      { token: 'constant', foreground: 'cb4b16' },
      { token: 'tag', foreground: '268bd2' },
      { token: 'attribute.name', foreground: '586e75' },
      { token: 'attribute.value', foreground: '2aa198' },
    ],
    colors: {
      'editor.background': '#fdf6e3',
      'editor.foreground': '#657b83',
      'editor.lineHighlightBackground': '#eee8d5',
      'editor.selectionBackground': '#eee8d5',
      'editorCursor.foreground': '#657b83',
      'editorWhitespace.foreground': '#eee8d5',
      'editorIndentGuide.background': '#eee8d5',
      'editorIndentGuide.activeBackground': '#93a1a1',
    }
  })

  // Monokai Theme
  monaco.editor.defineTheme('monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'regexp', foreground: 'f92672' },
      { token: 'type', foreground: '66d9ef' },
      { token: 'class', foreground: 'a6e22e' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'constant', foreground: 'ae81ff' },
      { token: 'tag', foreground: 'f92672' },
      { token: 'attribute.name', foreground: 'a6e22e' },
      { token: 'attribute.value', foreground: 'e6db74' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorCursor.foreground': '#f8f8f0',
      'editorWhitespace.foreground': '#464741',
      'editorIndentGuide.background': '#464741',
      'editorIndentGuide.activeBackground': '#75715e',
    }
  })

  // GitHub Dark Theme
  monaco.editor.defineTheme('github-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'regexp', foreground: '7ee787' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'class', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'c9d1d9' },
      { token: 'constant', foreground: '79c0ff' },
      { token: 'tag', foreground: '7ee787' },
      { token: 'attribute.name', foreground: '79c0ff' },
      { token: 'attribute.value', foreground: 'a5d6ff' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#c9d1d9',
      'editorWhitespace.foreground': '#30363d',
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',
    }
  })

  // GitHub Light Theme
  monaco.editor.defineTheme('github-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cf222e' },
      { token: 'string', foreground: '0a3069' },
      { token: 'number', foreground: '0550ae' },
      { token: 'regexp', foreground: '0a3069' },
      { token: 'type', foreground: '953800' },
      { token: 'class', foreground: '953800' },
      { token: 'function', foreground: '8250df' },
      { token: 'variable', foreground: '24292f' },
      { token: 'constant', foreground: '0550ae' },
      { token: 'tag', foreground: '116329' },
      { token: 'attribute.name', foreground: '0550ae' },
      { token: 'attribute.value', foreground: '0a3069' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292f',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.selectionBackground': '#ddf4ff',
      'editorCursor.foreground': '#24292f',
      'editorWhitespace.foreground': '#d0d7de',
      'editorIndentGuide.background': '#d0d7de',
      'editorIndentGuide.activeBackground': '#8c959f',
    }
  })
}

/**
 * 应用主题
 * @param {string} themeId - 主题 ID
 */
export function applyTheme(themeId) {
  monaco.editor.setTheme(themeId)
}

/**
 * 获取主题列表
 * @returns {array} 主题列表
 */
export function getThemeList() {
  return Object.entries(themes).map(([id, config]) => ({
    id,
    name: config.name,
    base: config.base
  }))
}

/**
 * 根据应用主题（亮/暗）获取默认编辑器主题
 * @param {string} appTheme - 应用主题 ('dark' 或 'light')
 * @returns {string} 编辑器主题 ID
 */
export function getDefaultEditorTheme(appTheme, language = 'plaintext') {
  if (language === 'json') {
    return appTheme === 'dark' ? 'jsonstudio-dark' : 'jsonstudio-light'
  }

  return appTheme === 'dark' ? 'vs-dark' : 'vs'
}
