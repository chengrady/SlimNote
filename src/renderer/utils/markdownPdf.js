import { marked } from 'marked'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import { DEFAULT_LIST_PREFIX_CLASS, buildStructuredPlainText, decorateListPrefixes, getListDepth, stripDecoratedListPrefixes } from './markdownListFormat'

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

function getMermaidTheme(theme = 'light') {
	return theme === 'dark' ? 'dark' : 'default'
}

function normalizeTextForCompare(value = '') {
	return String(value)
		.replace(/[`*_~#[\]()>-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase()
}

function getLeadingMarkdownHeading(content = '') {
	const match = String(content).match(/^\s*#\s+(.+?)\s*(?:\r?\n|$)/)
	return match ? match[1].trim() : ''
}

function shouldRenderDocumentHeader(content = '', title = '') {
	const normalizedTitle = normalizeTextForCompare(title)
	if (!normalizedTitle) return false

	const leadingHeading = getLeadingMarkdownHeading(content)
	if (!leadingHeading) return true

	return normalizeTextForCompare(leadingHeading) !== normalizedTitle
}

async function renderMermaidBlocksInHtml(html = '', theme = 'light') {
	if (!html || typeof DOMParser === 'undefined' || typeof document === 'undefined') {
		return html
	}

	const parser = new DOMParser()
	const doc = parser.parseFromString(`<div class="markdown-body-root">${html}</div>`, 'text/html')
	const root = doc.body.firstElementChild
	if (!root) return html

	const mermaidBlocks = Array.from(root.querySelectorAll('pre code.language-mermaid, pre code.lang-mermaid'))
	if (!mermaidBlocks.length) {
		return root.innerHTML
	}

	mermaid.initialize({
		startOnLoad: false,
		securityLevel: 'strict',
		theme: getMermaidTheme(theme)
	})

	for (const [index, block] of mermaidBlocks.entries()) {
		const pre = block.closest('pre')
		if (!pre) continue

		const source = block.textContent || ''
		try {
			const renderId = `slimnote-pdf-mermaid-${Date.now()}-${index}`
			const { svg } = await mermaid.render(renderId, source)
			const wrapper = doc.createElement('div')
			wrapper.className = 'mermaid-block'
			wrapper.innerHTML = svg
			pre.replaceWith(wrapper)
		} catch (error) {
			console.error('Failed to render Mermaid for PDF export:', error)
			const fallback = doc.createElement('div')
			fallback.className = 'mermaid-error-block'
			fallback.innerHTML = `<div class="mermaid-error-title">Mermaid render failed</div><pre><code>${escapeHtml(source)}</code></pre>`
			pre.replaceWith(fallback)
		}
	}

	decorateListPrefixes(root, { includeTaskListPrefix: false })

	return root.innerHTML
}

function buildPdfPreparationScript() {
	return String.raw`<script>
		(function () {
			const MM_TO_PX = 96 / 25.4
			const PAGE_CONTENT_WIDTH_MM = 210 - 14 - 14
			const PAGE_CONTENT_HEIGHT_MM = 297 - 16 - 18
			const MAX_SINGLE_PAGE_HEIGHT_RATIO = 0.92
			const MIN_SINGLE_PAGE_SCALE = 0.58
			const OUTPUT_SCALE = 2
			const MERMAID_PAGE_SLICE_CHROME_PX = 36

			function mmToPx(mm) {
				return mm * MM_TO_PX
			}

			function waitForImageLoad(image) {
				return new Promise((resolve, reject) => {
					if (image.complete && image.naturalWidth > 0) {
						resolve()
						return
					}

					image.onload = () => resolve()
					image.onerror = (error) => reject(error)
				})
			}

			function getSvgMetrics(svg) {
				const viewBox = svg.viewBox && svg.viewBox.baseVal
				const width = viewBox && viewBox.width
					? viewBox.width
					: svg.width && svg.width.baseVal && svg.width.baseVal.value
						? svg.width.baseVal.value
						: svg.getBBox().width
				const height = viewBox && viewBox.height
					? viewBox.height
					: svg.height && svg.height.baseVal && svg.height.baseVal.value
						? svg.height.baseVal.value
						: svg.getBBox().height

				return {
					width: Number(width) || 0,
					height: Number(height) || 0
				}
			}

			function ensureSvgViewBox(svg, width, height) {
				if (!svg.getAttribute('viewBox') && width > 0 && height > 0) {
					svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height)
				}
			}

			function createSvgDataUrl(svg) {
				const serialized = new XMLSerializer().serializeToString(svg)
				return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialized)
			}

			async function drawSvgToCanvas(svg, targetWidth, targetHeight) {
				const image = new Image()
				image.decoding = 'sync'
				image.src = createSvgDataUrl(svg)
				await waitForImageLoad(image)

				const canvas = document.createElement('canvas')
				canvas.width = Math.max(1, Math.round(targetWidth * OUTPUT_SCALE))
				canvas.height = Math.max(1, Math.round(targetHeight * OUTPUT_SCALE))
				const context = canvas.getContext('2d')
				context.scale(OUTPUT_SCALE, OUTPUT_SCALE)
				context.fillStyle = '#ffffff'
				context.fillRect(0, 0, targetWidth, targetHeight)
				context.drawImage(image, 0, 0, targetWidth, targetHeight)
				return canvas
			}

			function applySinglePageScale(block, svg, width, height) {
				block.classList.add('mermaid-block--single')
				block.classList.remove('mermaid-block--paginated')
				svg.style.width = Math.max(1, Math.round(width)) + 'px'
				svg.style.maxWidth = '100%'
				svg.style.height = Math.max(1, Math.round(height)) + 'px'
				svg.style.margin = '0 auto'
			}

			async function paginateBlock(block, svg, metrics, widthScale, sliceHeight) {
				const targetWidth = Math.max(1, Math.round(metrics.width * widthScale))
				const targetHeight = Math.max(1, Math.round(metrics.height * widthScale))
				const fullCanvas = await drawSvgToCanvas(svg, targetWidth, targetHeight)
				const pageSliceHeight = Math.max(240, Math.floor(sliceHeight))
				const fragment = document.createDocumentFragment()

				for (let offset = 0; offset < targetHeight; offset += pageSliceHeight) {
					const currentSliceHeight = Math.min(pageSliceHeight, targetHeight - offset)
					const sliceCanvas = document.createElement('canvas')
					sliceCanvas.width = fullCanvas.width
					sliceCanvas.height = Math.max(1, Math.round(currentSliceHeight * OUTPUT_SCALE))
					const sliceContext = sliceCanvas.getContext('2d')
					sliceContext.fillStyle = '#ffffff'
					sliceContext.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
					sliceContext.drawImage(
						fullCanvas,
						0,
						Math.round(offset * OUTPUT_SCALE),
						fullCanvas.width,
						Math.round(currentSliceHeight * OUTPUT_SCALE),
						0,
						0,
						sliceCanvas.width,
						sliceCanvas.height
					)

					const slice = document.createElement('div')
					slice.className = 'mermaid-page-slice'
					if (offset > 0) {
						slice.classList.add('mermaid-page-slice--followup')
					}

					const image = document.createElement('img')
					image.alt = 'Mermaid diagram page slice'
					image.src = sliceCanvas.toDataURL('image/png')
					slice.appendChild(image)

					fragment.appendChild(slice)
				}

				block.classList.remove('mermaid-block--single')
				block.classList.add('mermaid-block--paginated')
				block.innerHTML = ''
				block.appendChild(fragment)
			}

			async function prepareMermaidBlock(block) {
				const svg = block.querySelector('svg')
				if (!svg) return

				const metrics = getSvgMetrics(svg)
				if (!metrics.width || !metrics.height) return

				ensureSvgViewBox(svg, metrics.width, metrics.height)

				const contentWidth = mmToPx(PAGE_CONTENT_WIDTH_MM)
				const contentHeight = mmToPx(PAGE_CONTENT_HEIGHT_MM)
				const blockWidth = block.getBoundingClientRect().width || contentWidth
				const usableWidth = Math.max(220, Math.min(contentWidth, blockWidth - 16))
				const widthScale = Math.min(1, usableWidth / metrics.width)
				const fittedHeight = metrics.height * widthScale
				const maxSinglePageHeight = Math.max(
					240,
					(contentHeight - MERMAID_PAGE_SLICE_CHROME_PX) * MAX_SINGLE_PAGE_HEIGHT_RATIO
				)
				const singlePageScale = Math.min(widthScale, maxSinglePageHeight / metrics.height)

				if (fittedHeight <= maxSinglePageHeight || singlePageScale >= MIN_SINGLE_PAGE_SCALE) {
					const finalScale = fittedHeight <= maxSinglePageHeight ? widthScale : singlePageScale
					applySinglePageScale(block, svg, metrics.width * finalScale, metrics.height * finalScale)
					return
				}

				await paginateBlock(block, svg, metrics, widthScale, maxSinglePageHeight)
			}

			async function preparePdfMermaidLayout() {
				const blocks = Array.from(document.querySelectorAll('.markdown-body .mermaid-block'))
				for (const block of blocks) {
					await prepareMermaidBlock(block)
				}
				return true
			}

			window.__slimnotePdfReady = new Promise((resolve) => {
				const run = async () => {
					try {
						if (document.fonts && document.fonts.ready) {
							await document.fonts.ready
						}
						await preparePdfMermaidLayout()
						resolve(true)
					} catch (error) {
						console.error('SlimNote PDF layout preparation failed:', error)
						resolve(false)
					}
				}

				if (document.readyState === 'complete') {
					run()
				} else {
					window.addEventListener('load', run, { once: true })
				}
			})
		})()
	</script>`
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

	const getIndentByDepth = (depth) => `${18 + Math.min(depth, 6) * 30}px`
	stripDecoratedListPrefixes(root)

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
			marginLeft: depth > 0 ? getIndentByDepth(depth - 1) : '0',
			paddingLeft: list.tagName === 'OL' ? '28px' : '24px',
			listStylePosition: 'outside',
			listStyleType: list.tagName === 'OL' ? 'decimal' : 'disc'
		})
	})

	root.querySelectorAll('li').forEach((item) => {
		const depth = getListDepth(item)
		applyStyles(item, {
			margin: '0 0 6px',
			paddingLeft: `${depth > 0 ? 2 : 0}px`
		})

		const leadBlock = item.querySelector(':scope > p, :scope > div')
		if (leadBlock) {
			applyStyles(leadBlock, {
				margin: '0',
				display: 'block',
				paddingLeft: `${depth > 0 ? 2 : 0}px`
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
			padding-left: 24px;
			list-style-position: outside;
		}
		.slimnote-clipboard li ul,
		.slimnote-clipboard li ol {
			margin-left: 0;
			margin-top: 6px;
			margin-bottom: 8px;
			padding-left: 24px;
		}
		.slimnote-clipboard code {
			font-family: Consolas, "Cascadia Code", monospace;
		}
		.slimnote-clipboard pre {
			white-space: pre-wrap;
		}
	`
	root.prepend(style)

	const text = buildStructuredPlainText(root)

	return {
		html: root.outerHTML,
		text
	}
}

export function buildMarkdownFragmentClipboardPayload({ html = '', sourcePath = '' } = {}) {
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

export function buildMarkdownClipboardPayload({ content = '', sourcePath = '' } = {}) {
	const html = buildMarkdownHtml(content)
	return buildMarkdownFragmentClipboardPayload({ html, sourcePath })
}

export async function buildMarkdownPdfDocument({ content = '', title = 'Markdown Document', theme = 'light', sourcePath = '' } = {}) {
	const pdfTheme = 'light'
	const html = await renderMermaidBlocksInHtml(buildMarkdownHtml(content || ''), pdfTheme)
	const safeTitle = escapeHtml(title)
	const baseHref = getDirectoryFileUrl(sourcePath)
	const renderDocumentHeader = shouldRenderDocumentHeader(content, title)
	const documentHeaderHtml = renderDocumentHeader
		? `<header class="document-header">
				<h1 class="document-title">${safeTitle}</h1>
				<div class="document-subtitle">由 SlimNote 导出为 PDF</div>
			</header>`
		: ''

	return `<!DOCTYPE html>
<html lang="zh-CN">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${safeTitle}</title>
		${baseHref ? `<base href="${baseHref}">` : ''}
		<style>
			:root {
				color-scheme: light;
				--page-bg: #ffffff;
				--surface-bg: #ffffff;
				--text-main: #1f2937;
				--text-muted: #6b7280;
				--border-color: rgba(15, 23, 42, 0.1);
				--accent: #2563eb;
				--code-bg: #f6f8fb;
				--quote-bg: rgba(37, 99, 235, 0.06);
				--table-stripe: rgba(15, 23, 42, 0.02);
			}

			@page {
				size: A4;
				margin: 16mm 14mm 18mm;
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
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
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
				page-break-after: avoid;
				break-after: avoid-page;
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
				font-size: 14px;
				line-height: 1.7;
			}

			.markdown-body > :first-child {
				margin-top: 0;
			}

			.markdown-body > :last-child {
				margin-bottom: 0;
			}

			.markdown-body h1,
			.markdown-body h2,
			.markdown-body h3,
			.markdown-body h4,
			.markdown-body h5,
			.markdown-body h6 {
				color: var(--text-main);
				page-break-after: avoid;
				break-after: avoid-page;
				margin: 1.4em 0 0.6em;
				line-height: 1.3;
			}

			.markdown-body h1 { font-size: 2em; }
			.markdown-body h2 { font-size: 1.5em; }
			.markdown-body h3 { font-size: 1.25em; }
			.markdown-body h4 { font-size: 1em; }
			.markdown-body h5 { font-size: 0.875em; }
			.markdown-body h6 {
				font-size: 0.85em;
				color: var(--text-muted);
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

			.markdown-body p,
			.markdown-body li {
				orphans: 3;
				widows: 3;
			}

			.markdown-body ul,
			.markdown-body ol {
				padding-left: 4px;
				list-style: none;
			}

			.markdown-body li + li {
				margin-top: 0.35em;
			}

			.markdown-body li ul,
			.markdown-body li ol {
				margin-left: 48px;
				margin-top: 6px;
				margin-bottom: 8px;
				padding-left: 12px;
				border-left: 2px solid var(--border-color);
			}

			.markdown-body .${DEFAULT_LIST_PREFIX_CLASS} {
				display: inline;
				white-space: pre-wrap;
				font-variant-numeric: tabular-nums;
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
				overflow-wrap: anywhere;
				tab-size: 2;
			}

			.markdown-body pre code {
				background: transparent;
				border: 0;
				padding: 0;
				font-size: 0.9em;
				white-space: pre-wrap;
				word-break: break-word;
				overflow-wrap: anywhere;
			}

			.markdown-body .mermaid-block,
			.markdown-body .mermaid-error-block {
				margin: 0 0 1em;
				padding: 10px 8px;
				background: #ffffff;
				border: 1px solid var(--border-color);
				border-radius: 12px;
				overflow: hidden;
				text-align: center;
				page-break-inside: auto;
				break-inside: auto;
			}

			.markdown-body .mermaid-block--paginated {
				padding: 0;
				background: transparent;
				border: 0;
			}

			.markdown-body .mermaid-page-slice {
				margin: 0 0 12px;
				padding: 10px 8px;
				background: #ffffff;
				border: 1px solid var(--border-color);
				border-radius: 12px;
				overflow: hidden;
				page-break-inside: avoid;
				break-inside: avoid-page;
			}

			.markdown-body .mermaid-page-slice--followup {
				page-break-before: always;
				break-before: page;
			}

			.markdown-body .mermaid-page-slice img {
				display: block;
				width: 100%;
				height: auto;
				margin: 0;
			}

			.markdown-body .mermaid-block svg {
				display: block;
				width: auto;
				max-width: 100%;
				height: auto;
				margin: 0 auto;
				overflow: visible;
			}

			.markdown-body .mermaid-block svg foreignObject {
				overflow: visible;
			}

			.markdown-body .mermaid-block .label,
			.markdown-body .mermaid-block .nodeLabel,
			.markdown-body .mermaid-block .edgeLabel {
				max-width: 100%;
				word-break: break-word;
				white-space: normal;
			}

			.markdown-body .mermaid-error-title {
				margin-bottom: 10px;
				font-weight: 600;
				color: #d14343;
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
				table-layout: auto;
				font-size: 12.5px;
			}

			.markdown-body thead {
				display: table-header-group;
			}

			.markdown-body tfoot {
				display: table-footer-group;
			}

			.markdown-body tr {
				page-break-inside: avoid;
				break-inside: avoid;
			}

			.markdown-body th,
			.markdown-body td {
				border: 1px solid var(--border-color);
				padding: 8px 10px;
				text-align: left;
				vertical-align: top;
				word-break: break-word;
				overflow-wrap: anywhere;
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
			${documentHeaderHtml}
			<article class="markdown-body">${html}</article>
		</main>
		${buildPdfPreparationScript()}
	</body>
</html>`
}
