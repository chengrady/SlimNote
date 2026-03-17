/**
 * 图片导出工具
 * 将代码导出为带语法高亮的图片
 */
import html2canvas from 'html2canvas'

/**
 * 导出编辑器内容为图片
 * @param {HTMLElement} element - 要导出的 DOM 元素
 * @param {object} options - 导出选项
 * @returns {Promise<Blob>} 图片 Blob
 */
export async function exportToImage(element, options = {}) {
  const {
    backgroundColor = '#1e1e1e',
    padding = 20,
    scale = 2
  } = options

  try {
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true
    })

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create image blob'))
        }
      }, 'image/png')
    })
  } catch (e) {
    throw new Error(`导出图片失败: ${e.message}`)
  }
}

/**
 * 下载图片
 * @param {Blob} blob - 图片 Blob
 * @param {string} filename - 文件名
 */
export function downloadImage(blob, filename = 'json-export.png') {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 复制图片到剪贴板
 * @param {Blob} blob - 图片 Blob
 * @returns {Promise<void>}
 */
export async function copyImageToClipboard(blob) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
  } catch (e) {
    throw new Error(`复制到剪贴板失败: ${e.message}`)
  }
}

/**
 * 创建代码高亮容器
 * @param {string} code - 代码内容
 * @param {string} language - 语言
 * @param {object} options - 选项
 * @returns {HTMLElement} 创建的容器元素
 */
export function createCodeContainer(code, language = 'json', options = {}) {
  const {
    theme = 'dark',
    fontSize = 14,
    fontFamily = 'Consolas, Monaco, monospace',
    lineNumbers = true,
    width = 800,
    padding = 20
  } = options

  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    background: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
    color: ${theme === 'dark' ? '#d4d4d4' : '#333333'};
    padding: ${padding}px;
    border-radius: 8px;
    width: ${width}px;
    font-family: ${fontFamily};
    font-size: ${fontSize}px;
    line-height: 1.5;
    overflow: hidden;
  `

  const lines = code.split('\n')
  const lineNumberWidth = String(lines.length).length * fontSize * 0.6 + 20

  lines.forEach((line, index) => {
    const lineEl = document.createElement('div')
    lineEl.style.cssText = `
      display: flex;
      min-height: ${fontSize * 1.5}px;
    `

    if (lineNumbers) {
      const lineNumber = document.createElement('span')
      lineNumber.textContent = index + 1
      lineNumber.style.cssText = `
        color: ${theme === 'dark' ? '#858585' : '#999999'};
        min-width: ${lineNumberWidth}px;
        text-align: right;
        padding-right: 16px;
        user-select: none;
      `
      lineEl.appendChild(lineNumber)
    }

    const codeLine = document.createElement('span')
    codeLine.textContent = line || ' '
    codeLine.style.cssText = `
      white-space: pre;
      flex: 1;
    `
    lineEl.appendChild(codeLine)
    container.appendChild(lineEl)
  })

  document.body.appendChild(container)
  return container
}

/**
 * 移除代码容器
 * @param {HTMLElement} container - 容器元素
 */
export function removeCodeContainer(container) {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

/**
 * 导出代码为图片（完整流程）
 * @param {string} code - 代码内容
 * @param {object} options - 选项
 * @returns {Promise<Blob>} 图片 Blob
 */
export async function exportCodeToImage(code, options = {}) {
  const container = createCodeContainer(code, 'json', options)
  try {
    const blob = await exportToImage(container, options)
    return blob
  } finally {
    removeCodeContainer(container)
  }
}
