import { marked } from 'marked'
import hljs from 'highlight.js'

function escapeHtml(value = '') {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function getDirectoryFileUrl(filePath = '') {
	if (!filePath) return ''

	const normalized = filePath.replace(/\\/g, '/')
	const lastSlashIndex = normalized.lastIndexOf('/')
	const directoryPath = lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex + 1) : normalized

	if (!directoryPath) return ''

	if (/^[a-zA-Z]:\//.test(directoryPath)) {
		return encodeURI(`file:///${directoryPath}`)
	}

	return encodeURI(`file://${directoryPath.startsWith('/') ? '' : '/'}${directoryPath}`)
}

function configureMarked() {
	marked.setOptions({
		gfm: true,
		breaks: true,
		highlight(code, lang) {
			if (lang && hljs.getLanguage(lang)) {
				return hljs.highlight(code, { language: lang }).value
			}

			return hljs.highlightAuto(code).value
		}
	})
}

function buildMarkdownHtml(content = '') {
	configureMarked()
	return marked.parse(content || '')
}

function createClipboardHtmlFragment(html = '') {
	if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
		return {
			html: `<div class="slimnote-clipboard markdown-body">${html}</div>`,
			text: html.replace(/<[^>]+>/g, ' ')
		}
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(`<div class="slimnote-clipboard markdown-body">${html}</div>`, 'text/html')
	const root = doc.body.firstElementChild

	if (!root) {
		return { html: '', text: '' }
	}

	const applyStyles = (element, styles = {}) => {
		if (!element) return
		Object.entries(styles).forEach(([key, value]) => {
			element.style[key] = value
		})
	}

	const getIndentByDepth = (depth) => `${Math.min(depth, 6) * 28}px`
	const getMarkerWidthByDepth = (depth) => `${28 + Math.min(depth, 5) * 6}px`

	const getListDepth = (element) => {
		let depth = 0
		let current = element?.parentElement

		while (current) {
			if (current.tagName === 'UL' || current.tagName === 'OL') {
				depth += 1
			}
			current = current.parentElement
		}

		return Math.max(0, depth - 1)
	}

	const buildPlainText = (sourceRoot) => {
		const textRoot = sourceRoot.cloneNode(true)
		textRoot.querySelectorAll('style').forEach((node) => node.remove())

		textRoot.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
			const level = Number(heading.tagName.slice(1)) || 1
			if (level > 1) {
				heading.prepend(textRoot.ownerDocument.createTextNode('  '.repeat(level - 1)))
			}
		})

		textRoot.querySelectorAll('li').forEach((item) => {
			const depth = getListDepth(item)
			if (depth <= 0) return

			const indent = '    '.repeat(depth)
			const target = item.querySelector(':scope > p, :scope > div') || item
			target.prepend(textRoot.ownerDocument.createTextNode(indent))
		})

		const text = textRoot.innerText || textRoot.textContent || ''
		return text
			.replace(/\n{3,}/g, '\n\n')
			.replace(/[ \t]+\n/g, '\n')
			.trim()
	}

	const injectMarker = (li, markerText) => {
		if (!li || li.querySelector(':scope > .slimnote-list-marker')) return

		const depth = getListDepth(li)

		const marker = doc.createElement('span')
		marker.className = 'slimnote-list-marker'
		marker.textContent = markerText
		applyStyles(marker, {
			display: 'inline-block',
			minWidth: getMarkerWidthByDepth(depth),
			whiteSpace: 'pre',
			fontWeight: '400',
			color: '#1f2937',
			verticalAlign: 'top'
		})

		const firstElement = li.firstElementChild
		if (firstElement && ['P', 'DIV'].includes(firstElement.tagName)) {
			firstElement.prepend(marker)
		} else {
			li.prepend(marker)
		}
	}

	root.querySelectorAll('ol').forEach((list) => {
		const start = Number(list.getAttribute('start') || 1)
		Array.from(list.children)
			.filter((child) => child.tagName === 'LI')
			.forEach((li, index) => injectMarker(li, `${start + index}. `))
	})

	root.querySelectorAll('ul').forEach((list) => {
		Array.from(list.children)
			.filter((child) => child.tagName === 'LI')
			.forEach((li) => {
				const checkbox = li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')
				if (checkbox) {
					const checked = checkbox.hasAttribute('checked') || checkbox.checked
					checkbox.remove()
					injectMarker(li, checked ? '[x] ' : '[ ] ')
					return
				}

				injectMarker(li, '• ')
			})
	})

	applyStyles(root, {
		fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
		fontSize: '14px',
		lineHeight: '1.7',
		color: '#1f2937',
		wordBreak: 'break-word'
	})

	root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
		const level = Number(heading.tagName.slice(1)) || 1
		const marginLeft = `${Math.max(0, level - 1) * 12}px`
		const fontSizeMap = {
			1: '26px',
			2: '22px',
			3: '19px',
			4: '17px',
			5: '15px',
			6: '14px'
		}

		applyStyles(heading, {
			margin: '18px 0 10px',
			marginLeft,
			lineHeight: '1.35',
			fontWeight: '700',
			fontSize: fontSizeMap[level] || '14px',
			color: '#111827',
			paddingBottom: level <= 2 ? '4px' : '0',
			borderBottom: level <= 2 ? '1px solid #dbe3f0' : 'none'
		})
	})

	root.querySelectorAll('p').forEach((paragraph) => {
		applyStyles(paragraph, {
			margin: '0 0 12px',
			color: '#1f2937'
		})
	})

	root.querySelectorAll('ul, ol').forEach((list) => {
		const depth = getListDepth(list)
		const isNested = depth > 0
		applyStyles(list, {
			margin: isNested ? '6px 0 8px' : '0 0 12px',
			marginLeft: getIndentByDepth(depth),
			paddingLeft: '0',
			listStyle: 'none'
		})
	})

	root.querySelectorAll('li').forEach((item) => {
		const depth = getListDepth(item)
		applyStyles(item, {
			display: 'block',
			margin: '0 0 6px',
			paddingLeft: `${depth > 0 ? 4 : 0}px`
		})

		const leadBlock = item.querySelector(':scope > p, :scope > div')
		if (leadBlock) {
			applyStyles(leadBlock, {
				margin: '0',
				display: 'block'
			})
		}
	})

	root.querySelectorAll('blockquote').forEach((quote) => {
		applyStyles(quote, {
			margin: '0 0 14px',
			padding: '10px 12px',
			borderLeft: '4px solid #2563eb',
			background: '#f5f9ff',
			color: '#334155',
			borderRadius: '0 8px 8px 0',
			whiteSpace: 'pre-wrap'
		})
	})

	root.querySelectorAll('blockquote p').forEach((paragraph) => {
		applyStyles(paragraph, {
			margin: '0'
		})
	})

	root.querySelectorAll('pre').forEach((block) => {
		applyStyles(block, {
			margin: '0 0 14px',
			padding: '12px 14px',
			background: '#f7f8fa',
			border: '1px solid #d8dee9',
			borderRadius: '8px',
			whiteSpace: 'pre-wrap',
			wordBreak: 'break-word',
			fontFamily: 'Consolas, "Cascadia Code", monospace',
			fontSize: '13px',
			lineHeight: '1.6',
			color: '#111827'
		})
	})

	root.querySelectorAll('pre code').forEach((code) => {
		applyStyles(code, {
			background: 'transparent',
			border: 'none',
			padding: '0',
			fontFamily: 'inherit',
			fontSize: 'inherit',
			whiteSpace: 'pre-wrap'
		})
	})

	root.querySelectorAll(':not(pre) > code').forEach((code) => {
		applyStyles(code, {
			padding: '2px 6px',
			borderRadius: '4px',
			background: '#f3f4f6',
			border: '1px solid #e5e7eb',
			fontFamily: 'Consolas, "Cascadia Code", monospace',
			fontSize: '13px',
			color: '#7c2d12'
		})
	})

	root.querySelectorAll('table').forEach((table) => {
		applyStyles(table, {
			width: '100%',
			margin: '0 0 14px',
			borderCollapse: 'collapse',
			borderSpacing: '0',
			border: '1px solid #cbd5e1',
			fontSize: '13px',
			msoTableLspace: '0pt',
			msoTableRspace: '0pt'
		})
	})

	root.querySelectorAll('thead tr').forEach((row) => {
		applyStyles(row, {
			background: '#eaf2ff'
		})
	})

	root.querySelectorAll('th, td').forEach((cell) => {
		applyStyles(cell, {
			border: '1px solid #cbd5e1',
			padding: '8px 10px',
			textAlign: 'left',
			verticalAlign: 'top',
			background: cell.tagName === 'TH' ? '#eaf2ff' : '#ffffff'
		})
	})

	root.querySelectorAll('a').forEach((link) => {
		applyStyles(link, {
			color: '#2563eb',
			textDecoration: 'none'
		})
	})

	root.querySelectorAll('img').forEach((image) => {
		applyStyles(image, {
			maxWidth: '100%',
			height: 'auto',
			display: 'block',
			margin: '10px auto'
		})
	})

	const style = doc.createElement('style')
	style.textContent = `
		.slimnote-clipboard {
			font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
			font-size: 14px;
			line-height: 1.7;
			color: #1f2937;
		}
		.slimnote-clipboard h1,
		.slimnote-clipboard h2,
		.slimnote-clipboard h3,
		.slimnote-clipboard h4,
		.slimnote-clipboard h5,
		.slimnote-clipboard h6 {
			margin: 1.2em 0 0.5em;
			line-height: 1.3;
		}
		.slimnote-clipboard h2 { margin-left: 12px; }
		.slimnote-clipboard h3 { margin-left: 24px; }
		.slimnote-clipboard h4 { margin-left: 36px; }
		.slimnote-clipboard h5 { margin-left: 48px; }
		.slimnote-clipboard h6 { margin-left: 60px; }
		.slimnote-clipboard p,
		.slimnote-clipboard ul,
		.slimnote-clipboard ol,
		.slimnote-clipboard blockquote,
		.slimnote-clipboard table,
		.slimnote-clipboard pre {
			margin: 0 0 1em;
		}
		.slimnote-clipboard ul,
		.slimnote-clipboard ol {
			padding-left: 0;
			list-style: none;
		}
		.slimnote-clipboard li {
			display: block;
		}
		.slimnote-clipboard li ul,
		.slimnote-clipboard li ol {
			margin-left: 28px;
			margin-top: 6px;
			margin-bottom: 8px;
		}
		.slimnote-clipboard code {
			font-family: Consolas, "Cascadia Code", monospace;
		}
		.slimnote-clipboard pre {
			white-space: pre-wrap;
		}
		.slimnote-clipboard .slimnote-list-marker {
			display: inline-block;
			min-width: 28px;
			font-weight: 400;
			white-space: pre;
			vertical-align: top;
		}
	`
	root.prepend(style)

	const text = buildPlainText(root)

	return {
		html: root.outerHTML,
		text
	}
}

export function buildMarkdownClipboardPayload({ content = '', sourcePath = '' } = {}) {
	const html = buildMarkdownHtml(content)
	const baseHref = getDirectoryFileUrl(sourcePath)
	const payload = createClipboardHtmlFragment(html)

	if (!payload.html) {
		return payload
	}

	return {
		html: `${baseHref ? `<base href="${baseHref}">` : ''}${payload.html}`,
		text: payload.text
	}
}

export function buildMarkdownPdfDocument({ content = '', title = 'Markdown Document', theme = 'light', sourcePath = '' } = {}) {
	const isDark = theme === 'dark'
	const html = buildMarkdownHtml(content || '')
	const safeTitle = escapeHtml(title)
	const baseHref = getDirectoryFileUrl(sourcePath)

	return `<!DOCTYPE html>
<html lang="zh-CN">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${safeTitle}</title>
		${baseHref ? `<base href="${baseHref}">` : ''}
		<style>
			:root {
				color-scheme: ${isDark ? 'dark' : 'light'};
				--page-bg: ${isDark ? '#0f1117' : '#ffffff'};
				--surface-bg: ${isDark ? '#161a22' : '#ffffff'};
				--text-main: ${isDark ? '#e8ecf3' : '#1f2937'};
				--text-muted: ${isDark ? '#9aa4b2' : '#6b7280'};
				--border-color: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'};
				--accent: ${isDark ? '#7cc4ff' : '#2563eb'};
				--code-bg: ${isDark ? '#11151d' : '#f6f8fb'};
				--quote-bg: ${isDark ? 'rgba(124,196,255,0.08)' : 'rgba(37,99,235,0.06)'};
				--table-stripe: ${isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.02)'};
			}

			@page {
				size: A4;
				margin: 18mm 16mm;
			}

			* {
				box-sizing: border-box;
			}

			html,
			body {
				margin: 0;
				padding: 0;
				background: var(--page-bg);
				color: var(--text-main);
				font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
				line-height: 1.7;
				font-size: 14px;
			}

			body {
				padding: 0;
			}

			.document {
				width: 100%;
				max-width: 100%;
				margin: 0 auto;
			}

			.document-header {
				margin-bottom: 24px;
				padding-bottom: 14px;
				border-bottom: 1px solid var(--border-color);
			}

			.document-title {
				margin: 0;
				font-size: 28px;
				line-height: 1.25;
				font-weight: 700;
			}

			.document-subtitle {
				margin-top: 8px;
				color: var(--text-muted);
				font-size: 12px;
			}

			.markdown-body {
				color: var(--text-main);
			}

			.markdown-body > :first-child {
				margin-top: 0;
			}

			.markdown-body h1,
			.markdown-body h2,
			.markdown-body h3,
			.markdown-body h4,
			.markdown-body h5,
			.markdown-body h6 {
				color: var(--text-main);
				page-break-after: avoid;
				margin: 1.4em 0 0.6em;
				line-height: 1.3;
			}

			.markdown-body h1,
			.markdown-body h2 {
				padding-bottom: 0.3em;
				border-bottom: 1px solid var(--border-color);
			}

			.markdown-body p,
			.markdown-body ul,
			.markdown-body ol,
			.markdown-body blockquote,
			.markdown-body table,
			.markdown-body pre {
				margin: 0 0 1em;
			}

			.markdown-body a {
				color: var(--accent);
				text-decoration: none;
			}

			.markdown-body img {
				max-width: 100%;
				display: block;
				margin: 12px auto;
				border-radius: 10px;
			}

			.markdown-body code {
				font-family: "Cascadia Code", "JetBrains Mono", Consolas, monospace;
				background: var(--code-bg);
				border: 1px solid var(--border-color);
				border-radius: 6px;
				padding: 0.15em 0.4em;
				font-size: 0.92em;
			}

			.markdown-body pre {
				background: var(--code-bg);
				border: 1px solid var(--border-color);
				border-radius: 12px;
				padding: 14px 16px;
				overflow: hidden;
				white-space: pre-wrap;
				word-break: break-word;
			}

			.markdown-body pre code {
				background: transparent;
				border: 0;
				padding: 0;
				font-size: 0.9em;
			}

			.markdown-body blockquote {
				padding: 10px 14px;
				margin-left: 0;
				border-left: 4px solid var(--accent);
				background: var(--quote-bg);
				border-radius: 0 10px 10px 0;
				color: var(--text-main);
			}

			.markdown-body table {
				width: 100%;
				border-collapse: collapse;
				border: 1px solid var(--border-color);
				overflow: hidden;
				border-radius: 10px;
			}

			.markdown-body th,
			.markdown-body td {
				border: 1px solid var(--border-color);
				padding: 10px 12px;
				text-align: left;
				vertical-align: top;
			}

			.markdown-body tbody tr:nth-child(even) {
				background: var(--table-stripe);
			}

			.markdown-body hr {
				border: none;
				border-top: 1px solid var(--border-color);
				margin: 1.5em 0;
			}

			.hljs {
				background: transparent;
				color: inherit;
			}
		</style>
	</head>
	<body>
		<main class="document">
			<header class="document-header">
				<h1 class="document-title">${safeTitle}</h1>
				<div class="document-subtitle">由 SlimNote 导出为 PDF</div>
			</header>
			<article class="markdown-body">${html}</article>
		</main>
	</body>
</html>`
}
