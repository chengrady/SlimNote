<div align="center">

<img src="public/logo.svg" alt="SlimNote Logo" width="120" height="120">

# SlimNote

**AI-Assisted Text & Code Editor for Markdown, JSON, SQL, Logs, and Notes**

SlimNote combines a practical desktop editor with an integrated AI assistant, inline smart suggestions, themed Markdown writing and export, automatic saving, JSON cleanup, SQL formatting, log inspection, and everyday text work.

[![Release](https://img.shields.io/github/v/release/chengrady/SlimNote?display_name=tag)](https://github.com/chengrady/SlimNote/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/chengrady/SlimNote)
[![Downloads](https://img.shields.io/github/downloads/chengrady/SlimNote/total)](https://github.com/chengrady/SlimNote/releases)

<p>
  <a href="https://github.com/chengrady/SlimNote/releases/latest">Download Latest Release</a>
  ·
  <a href="CHANGELOG.md">Changelog</a>
  ·
  <a href="#ai-assistant--smart-suggestions">AI Assistant</a>
  ·
  <a href="#english">English</a>
  ·
  <a href="#zh-cn">简体中文</a>
</p>

</div>

<p align="center">
  <img src="public/social-preview.png" alt="SlimNote Preview">
</p>

<a id="english"></a>

## English

### Overview

SlimNote is a desktop editor built for practical file work: Markdown writing, JSON cleanup, quick code edits, note taking, SQL formatting, log inspection, and AI-assisted editing. It combines a Monaco-based code editor, a Milkdown-powered Markdown workflow, a global theme system, automatic saving, an AI assistant panel, and built-in helper panels so common tasks stay in one focused window.

### Highlights

- Built-in AI assistant for asking questions, rewriting selected text, polishing Markdown, explaining code, and applying edits back into the editor
- Inline smart suggestions while typing, with configurable trigger delay, suggestion length, color, opacity, and log-file behavior
- Multi-provider AI configuration with OpenAI-compatible APIs, Anthropic, Zhipu GLM, MiniMax, DeepSeek, Qwen, MiMo, and custom endpoints
- Nine built-in themes for the app shell, Monaco editor, Markdown editor, preview, PDF export, and browser HTML preview
- Markdown workspace with WYSIWYG editing, source/preview flow, outline support, KaTeX, Mermaid-aware PDF export, and rendered browser preview
- Plain-text copy and rich copy from Markdown preview for Word and WeChat workflows
- JSON toolkit for formatting, compression, diff, tree view, schema generation, repair, and JMESPath query
- SQL formatting helpers plus multi-tab editing for code, notes, logs, and configuration files
- Automatic saving for named files with configurable delay, plus external file change detection
- Pinned tabs, session restore, recent files, recent folders, file tree navigation, and collapsed-folder workspace search
- Presentation Mode, activity bar navigation, always-on-top pin window, status bar details, automatic update checks with title-bar notification, and About dialog

### AI Assistant & Smart Suggestions

SlimNote keeps AI as a first-class editing tool rather than a separate chat window. The assistant can work with the current document, selected text, manual context, and conversation history, then return either an explanation or directly applicable edits.

| Capability | What it does |
|------------|--------------|
| Context-aware chat | Send the current document, selected text, and extra manual context with your request |
| Quick actions | Polish text, proofread, explain content, or request a freeform edit from the editor workflow |
| Auto-apply edits | Apply supported AI edits back into the selected text or the current document |
| Inline suggestions | Show predictive text inside Monaco and Milkdown editors, accepted from the editing flow |
| Conversation history | Keep AI sessions, switch between conversations, and summarize older context |
| Provider settings | Configure provider presets, models, API keys, request timeout, temperature, and token limits |

### Markdown Themes & Export

SlimNote 1.7.0 expands Markdown work with a global theme picker and a more consistent export path. The selected theme now drives the app surface, Monaco, Milkdown, preview, PDF output, and browser HTML preview, so writing and sharing keep the same visual language.

| Capability | What it does |
|------------|--------------|
| Built-in themes | Choose from Clean Paper, Ink White, Warm Note, Soft Color, Green Sprout, Star Blue, Dusk Purple, Night Orange, and Pure Black |
| Theme-aware exports | Keep Mermaid, tables, code blocks, quotes, and highlights aligned with the selected theme in PDF and browser preview |
| Browser preview | Open rendered Markdown HTML in the system browser from the editor toolbar |
| Source list formatting | Convert multi-line selections into unordered, ordered, or task lists from source editing |

### Built-In Tools

| Tool | What it helps with |
|------|---------------------|
| Markdown | WYSIWYG editing, source formatting, themed preview, outline, browser preview, export to PDF/image, plain-text copy, rich copy |
| AI Assistant | Context-aware chat, inline smart suggestions, selected-content actions, provider/model settings, auto-apply edits |
| JSON | Format, compress, diff, tree view, schema generation, repair, JMESPath query, format conversion |
| SQL | Formatting with dialect-aware helpers |
| Workspace | Pinned tabs, recent files/folders, file tree browsing, collapsed-folder search, session restore |

### Download

- Latest release: [GitHub Releases](https://github.com/chengrady/SlimNote/releases/latest)
- Current published release assets: Windows installer (`.exe`) and Windows portable (`.exe`)
- Packaged builds can check GitHub Releases from inside the app and download available updates
- Build scripts are available in the repository for Windows, macOS, and Linux

### Run from Source

```bash
git clone https://github.com/chengrady/SlimNote.git
cd SlimNote
npm install
npm run dev
```

### Build

```bash
npm run build
npm run build:win
npm run build:mac
npm run build:linux
```

Build artifacts are generated in the `release/` directory.

### Project Notes

- Release notes live in [CHANGELOG.md](CHANGELOG.md)
- The current README focuses on product overview and onboarding rather than version-by-version release details

<a id="zh-cn"></a>

## 简体中文

### 项目简介

SlimNote 是一个面向日常文件工作的桌面编辑器，适合处理 Markdown 编写、JSON 整理、代码修改、笔记记录、SQL 格式化、日志查看和 AI 辅助编辑等场景。它把基于 Monaco 的代码编辑能力、基于 Milkdown 的 Markdown 工作流、全局主题系统、自动保存、AI 助手面板，以及常用辅助工具面板放进同一个专注的桌面窗口里。

### 核心亮点

- 内置 AI 助手，可提问、改写选中文本、润色 Markdown、解释代码，并把修改结果应用回编辑器
- 提供行内智能提示，支持配置触发延迟、提示长度、颜色、透明度和日志文件启用策略
- 支持多供应商 AI 配置，覆盖 OpenAI 兼容接口、Anthropic、智谱 GLM、MiniMax、DeepSeek、通义千问、MiMo 和自定义接口
- 内置 9 套主题，覆盖应用外壳、Monaco 编辑器、Markdown 编辑器、预览、PDF 导出和浏览器 HTML 预览
- 提供 Markdown 所见即所得编辑、源码与预览协同、目录支持、KaTeX、兼顾 Mermaid 的 PDF 导出和浏览器渲染预览
- 支持从 Markdown 预览区复制纯文本和富文本，便于粘贴到 Word、微信等场景
- 内置 JSON 工具箱，支持格式化、压缩、Diff、树视图、Schema 生成、修复和 JMESPath 查询
- 提供 SQL 格式化能力，并支持代码、笔记、日志、配置文件等多标签编辑
- 支持带延迟配置的已命名文件自动保存，并保留外部文件变更检测
- 支持固定标签、会话恢复、最近文件、最近文件夹、文件树导航和折叠目录工作区搜索
- 提供演示模式、活动栏切换、置顶悬浮窗、状态栏信息、自动更新检查与标题栏提示，以及 About 对话框

### AI 助手与智能提示

SlimNote 把 AI 保持为编辑器内的一等能力，而不是外置聊天窗口。AI 助手可以读取当前文档、选中文本、手动补充的上下文和会话历史，然后返回解释内容，或生成可直接应用的修改。

| 能力 | 说明 |
|------|------|
| 带上下文对话 | 将当前文档、选中文本和额外上下文一起发送给 AI |
| 快捷操作 | 在编辑流程中润色、校对、解释内容，或提出自由编辑需求 |
| 自动应用修改 | 将支持的 AI 修改应用回选中文本或当前文档 |
| 行内智能提示 | 在 Monaco 和 Milkdown 编辑器内显示预测文本，直接融入输入流程 |
| 会话历史 | 保留 AI 会话、切换历史对话，并对较早上下文做摘要 |
| 供应商设置 | 配置供应商预设、模型、API Key、请求超时、温度和 token 限制 |

### Markdown 主题与导出

SlimNote 1.7.0 扩展了 Markdown 工作流，新增全局主题选择器，并让导出链路更一致。当前主题会同时影响应用界面、Monaco、Milkdown、预览、PDF 输出和浏览器 HTML 预览，让写作和分享保持统一的视觉风格。

| 能力 | 说明 |
|------|------|
| 内置主题 | 可选择清纸、墨白、暖笺、淡彩、青芽、星蓝、暮紫、夜橙、玄黑 |
| 主题化导出 | PDF 和浏览器预览中的 Mermaid、表格、代码块、引用和高亮会跟随当前主题 |
| 浏览器预览 | 可从编辑器工具栏在系统浏览器中打开渲染后的 Markdown HTML |
| 源码列表格式化 | 在源码编辑中把多行选区转换为无序、有序或任务列表 |

### 内置工具

| 工具 | 适用场景 |
|------|----------|
| Markdown | 所见即所得编辑、源码格式化、主题化预览、目录、浏览器预览、导出 PDF/图片、复制纯文本、复制富文本 |
| AI 助手 | 带上下文对话、行内智能提示、选区快捷操作、供应商/模型设置、自动应用修改 |
| JSON | 格式化、压缩、Diff、树视图、Schema 生成、修复、JMESPath 查询、格式转换 |
| SQL | 多方言格式化辅助 |
| 工作区 | 固定标签、最近文件/文件夹、文件树浏览、折叠目录搜索、会话恢复 |

### 下载方式

- 最新版本： [GitHub Releases](https://github.com/chengrady/SlimNote/releases/latest)
- 当前已发布的安装产物：Windows 安装版（`.exe`）和 Windows 便携版（`.exe`）
- 打包后的应用可在应用内检查 GitHub Releases 并下载可用更新
- 仓库中保留了 Windows、macOS、Linux 的构建脚本，可自行从源码构建

### 从源码运行

```bash
git clone https://github.com/chengrady/SlimNote.git
cd SlimNote
npm install
npm run dev
```

### 构建

```bash
npm run build
npm run build:win
npm run build:mac
npm run build:linux
```

构建产物会输出到 `release/` 目录。

### 项目说明

- 发版记录统一维护在 [CHANGELOG.md](CHANGELOG.md)
- 当前 README 主要负责介绍产品定位、能力范围和上手方式，不再按版本堆叠更新细节

## Supported File Types / 支持的文件类型

| Category / 类别 | Extensions / 扩展名 |
|-----------------|---------------------|
| Text / 文本 | `txt`, `text`, `md`, `markdown`, `mdx`, `log` |
| Data / 数据 | `json`, `jsonc`, `yaml`, `yml`, `xml`, `toml`, `csv`, `tsv` |
| Config / 配置 | `ini`, `conf`, `config`, `properties` |
| Web / Web 前端 | `html`, `htm`, `css`, `scss`, `sass`, `less`, `js`, `mjs`, `cjs`, `ts`, `mts`, `cts`, `jsx`, `tsx`, `vue` |
| Programming / 编程语言 | `py`, `java`, `c`, `cpp`, `cc`, `cxx`, `h`, `hpp`, `cs`, `sql` |
| Shell & Script / 脚本 | `sh`, `bash`, `zsh`, `ps1`, `bat`, `cmd` |
| Special Files / 特殊文件 | `.env`, `.env.*`, `.gitignore`, `.gitattributes`, `.editorconfig`, `Dockerfile`, `Makefile`, `README`, `LICENSE`, `CHANGELOG` |

## Keyboard Shortcuts / 快捷键

| Action / 功能 | Windows/Linux | macOS |
|---------------|---------------|-------|
| New File / 新建文件 | `Ctrl+N` | `Cmd+N` |
| Open File / 打开文件 | `Ctrl+O` | `Cmd+O` |
| Open Folder / 打开文件夹 | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| Save / 保存 | `Ctrl+S` | `Cmd+S` |
| Save As / 另存为 | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Find / 查找 | `Ctrl+F` | `Cmd+F` |
| Replace / 替换 | `Ctrl+H` | `Cmd+H` |
| Global Search / 全局搜索 | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Toggle Fullscreen / 切换全屏 | `F11` | `Ctrl+Cmd+F` |
| Presentation Mode / 演示模式 | `Shift+F5` | `Shift+Cmd+P` |

## Tech Stack / 技术栈

| Technology | Version | Description |
|------------|---------|-------------|
| [Electron](https://www.electronjs.org/) | 28.3.3 | Desktop application shell |
| [Vue](https://vuejs.org/) | 3.4.21 | UI framework |
| [Vite](https://vitejs.dev/) | 5.1.6 | Build tool and dev server |
| [Pinia](https://pinia.vuejs.org/) | 2.1.7 | State management |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 0.47.0 | Code editing engine |
| [Milkdown](https://milkdown.dev/) | 7.18.0 | Markdown editing experience |
| [Vue I18n](https://vue-i18n.intlify.dev/) | 9.14.5 | Internationalization |
| [electron-builder](https://www.electron.build/) | 24.13.3 | Packaging and distribution |

## Roadmap / 路线图

- [ ] Snippet library / 代码片段管理
- [ ] Workspace profiles / 工作区配置方案
- [ ] Plugin system / 插件系统
- [ ] Git integration / Git 集成
- [ ] Terminal integration / 终端集成
- [ ] Remote file editing (`SSH` / `FTP`) / 远程文件编辑
- [ ] Collaborative editing / 协作编辑

## Contributing / 参与贡献

1. Fork the repository / Fork 本仓库
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push your branch: `git push origin feature/YourFeature`
5. Open a pull request / 提交 Pull Request

## License / 许可证

This project is licensed under the [MIT License](LICENSE).  
本项目基于 [MIT License](LICENSE) 开源。
