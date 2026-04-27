<div align="center">

<img src="public/logo.svg" alt="SlimNote Logo" width="120" height="120">

# SlimNote

**A Modern Cross-Platform Text & Code Editor**  
**一个现代化的跨平台文本与代码编辑器**

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/chengrady/SlimNote)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28-47848f?logo=electron)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4-42b883?logo=vue.js)](https://vuejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

**English** | [**简体中文**](#简体中文)

</div>

---

## English

### Overview

SlimNote is a lightweight yet powerful text and code editor built with **Electron**, **Vue 3**, **Monaco Editor**, and **Milkdown**. It provides a smooth editing experience for code, Markdown, JSON, SQL, logs, and other common text files.

### Features

#### Code Editor (Monaco)
- Syntax highlighting for 50+ languages
- Intelligent code completion
- Code folding and minimap
- Multi-cursor editing
- Find and replace with regex support

#### Markdown Editor (Milkdown)
- WYSIWYG editing experience
- Real-time preview
- GFM (GitHub Flavored Markdown) support
- KaTeX math formulas
- Prism code highlighting
- Image upload support
- Copy selected content as plain text or rich content for Word/WeChat
- Export to PDF and image

#### File Management
- Multi-tab editing
- Pinned tabs with session restore
- File tree explorer
- Auto encoding detection
- Recent files and recent folders
- External file change detection with reload prompt
- Auto-save support

#### Built-in Tool Panels
- **JSON Toolkit**: format, compress, diff, tree view, schema generation, repair, and JMESPath query
- **SQL Toolkit**: formatting with multiple dialect support
- **Markdown Toolkit**: export to PDF and image, plus preview copy helpers for plain text and Word/WeChat

#### User Experience
- Unified desktop UI for dialogs, cards, spacing, and controls
- File, edit, and view menus in the custom title bar
- Help menu with update check and About dialog
- Enlarged settings dialog with About section and GitHub entry
- Resizable sidebar and improved workspace layout
- Activity bar with Explorer and Recent views
- Presentation mode for focused reading and demos
- Pin floating window (always on top)
- Status bar with file info

### What's New in 1.4.0

- Added external file change detection with a reload prompt to avoid silently showing stale content
- Added Presentation Mode and an Activity Bar for faster switching between Explorer and Recent views
- Improved workspace layout, sidebar interactions, tab organization, and pinned-tab persistence
- Improved Markdown editing with automatic list continuation on Enter
- Refined title bar shortcuts and refreshed multiple desktop UI details for better readability and consistency

### Installation

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| Windows | `.exe` (Installer) / `.exe` (Portable) |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

GitHub Releases: [github.com/chengrady/SlimNote/releases](https://github.com/chengrady/SlimNote/releases)

### Quick Start

```bash
git clone https://github.com/chengrady/SlimNote.git
cd SlimNote
npm install
npm run dev
```

### Build

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux

# Build default package
npm run build
```

Build artifacts are generated in the `release/` directory.

Typical Windows outputs:

- `release/SlimNote-Setup-1.4.0.exe`
- `release/SlimNote-1.4.0.exe`
- `release/latest.yml`

### Supported File Formats

| Category | Extensions |
|----------|------------|
| Text | txt, text, md, markdown, mdx, log |
| Data | json, jsonc, yaml, yml, xml, toml, csv, tsv |
| Config | ini, conf, config, properties |
| Web | html, htm, css, scss, sass, less, js, mjs, cjs, ts, mts, cts, jsx, tsx, vue |
| Programming | py, java, c, cpp, cc, cxx, h, hpp, cs, sql |
| Shell & Script | sh, bash, zsh, ps1, bat, cmd |
| Special Files | .env, .env.*, .gitignore, .gitattributes, .editorconfig, Dockerfile, Makefile, README, LICENSE, CHANGELOG |

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New File | Ctrl+N | Cmd+N |
| Open File | Ctrl+O | Cmd+O |
| Open Folder | Ctrl+Shift+O | Cmd+Shift+O |
| Save | Ctrl+S | Cmd+S |
| Save As | Ctrl+Shift+S | Cmd+Shift+S |
| Find | Ctrl+F | Cmd+F |
| Replace | Ctrl+H | Cmd+H |
| Global Search | Ctrl+Shift+F | Cmd+Shift+F |
| Toggle Fullscreen | F11 | Ctrl+Cmd+F |
| Presentation Mode | Shift+F5 | Shift+Cmd+P |

### Contributing

Contributions are welcome. Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### License

This project is licensed under the [MIT License](LICENSE).

---

## 简体中文

[**English**](#english) | **简体中文**

### 项目简介

SlimNote 是一个基于 **Electron**、**Vue 3**、**Monaco Editor** 和 **Milkdown** 构建的轻量级文本与代码编辑器，为 Markdown、JSON、SQL、日志和常见文本文件提供流畅的桌面编辑体验。

### 功能特性

#### 代码编辑器 (Monaco)
- 支持 50+ 种语言的语法高亮
- 智能代码补全
- 代码折叠与小地图
- 多光标编辑
- 支持正则表达式的查找替换

#### Markdown 编辑器 (Milkdown)
- 所见即所得的编辑体验
- 实时预览
- GFM (GitHub Flavored Markdown) 支持
- KaTeX 数学公式
- Prism 代码高亮
- 图片上传支持
- 支持将选中的预览内容复制为纯文本或复制到 Word/微信
- 导出为 PDF 和图片

#### 文件管理
- 多标签页编辑
- 固定标签与会话恢复
- 文件树浏览器
- 自动检测文件编码
- 最近文件与最近文件夹
- 外部文件变更检测与重载提示
- 自动保存支持

#### 内置工具面板
- **JSON 工具箱**：格式化、压缩、Diff 对比、树形视图、Schema 生成、修复和 JMESPath 查询
- **SQL 工具箱**：支持多种方言的格式化
- **Markdown 工具箱**：导出为 PDF 和图片，并支持预览选区复制为纯文本或复制到 Word/微信

#### 使用体验
- 统一了弹框、卡片、间距和控件等桌面 UI 风格
- 在自定义标题栏中提供文件、编辑、视图菜单
- 帮助菜单内置检查更新与 About 入口
- 放大设置弹框，并新增 About 与 GitHub 入口
- 优化工作区侧栏和整体桌面布局
- 新增活动栏，可在资源管理器和最近视图之间快速切换
- 新增演示模式，便于沉浸阅读和展示
- 支持 Pin 浮动窗口（始终置顶）
- 状态栏显示文件信息

### 1.4.0 更新内容

- 新增外部文件变更检测，在文件被其他程序修改后弹出是否重载的提示，避免编辑器继续显示旧内容
- 新增演示模式与活动栏，可在资源管理器和最近视图之间快速切换
- 优化工作区布局、侧栏交互、标签组织方式以及固定标签的会话恢复
- 改进 Markdown 编辑体验，支持回车自动续写列表项
- 统一标题栏快捷键展示，并继续打磨多处桌面端界面细节与可读性

### 安装

下载适合您平台的最新版本：

| 平台 | 下载 |
|------|------|
| Windows | `.exe`（安装版） / `.exe`（便携版） |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

GitHub Releases: [github.com/chengrady/SlimNote/releases](https://github.com/chengrady/SlimNote/releases)

### 快速开始

```bash
git clone https://github.com/chengrady/SlimNote.git
cd SlimNote
npm install
npm run dev
```

### 构建

```bash
# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux

# 构建默认安装包
npm run build
```

构建产物位于 `release/` 目录。

常见 Windows 产物：

- `release/SlimNote-Setup-1.4.0.exe`
- `release/SlimNote-1.4.0.exe`
- `release/latest.yml`

### 支持的文件格式

| 类型 | 扩展名 |
|------|--------|
| 文本 | txt, text, md, markdown, mdx, log |
| 数据 | json, jsonc, yaml, yml, xml, toml, csv, tsv |
| 配置 | ini, conf, config, properties |
| Web | html, htm, css, scss, sass, less, js, mjs, cjs, ts, mts, cts, jsx, tsx, vue |
| 编程 | py, java, c, cpp, cc, cxx, h, hpp, cs, sql |
| Shell / 脚本 | sh, bash, zsh, ps1, bat, cmd |
| 特殊文件 | .env, .env.*, .gitignore, .gitattributes, .editorconfig, Dockerfile, Makefile, README, LICENSE, CHANGELOG |

### 快捷键

| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 新建文件 | Ctrl+N | Cmd+N |
| 打开文件 | Ctrl+O | Cmd+O |
| 打开文件夹 | Ctrl+Shift+O | Cmd+Shift+O |
| 保存 | Ctrl+S | Cmd+S |
| 另存为 | Ctrl+Shift+S | Cmd+Shift+S |
| 查找 | Ctrl+F | Cmd+F |
| 替换 | Ctrl+H | Cmd+H |
| 全局搜索 | Ctrl+Shift+F | Cmd+Shift+F |
| 切换全屏 | F11 | Ctrl+Cmd+F |
| 演示模式 | Shift+F5 | Shift+Cmd+P |

### 开发路线

- [ ] 代码片段管理
- [ ] 自定义快捷键
- [ ] 插件系统
- [ ] Git 集成
- [ ] 终端集成
- [ ] 远程文件编辑（SSH/FTP）
- [ ] 协作编辑

### 贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 提交 Pull Request

### 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

## Tech Stack

| Technology | Version | Description |
|------------|---------|-------------|
| [Electron](https://www.electronjs.org/) | 28.3.3 | Cross-platform desktop framework |
| [Vue](https://vuejs.org/) | 3.4.21 | Progressive JavaScript framework |
| [Vite](https://vitejs.dev/) | 5.1.6 | Next generation frontend tooling |
| [Pinia](https://pinia.vuejs.org/) | 2.1.7 | Vue state management |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 0.47.0 | Code editor (VS Code engine) |
| [Milkdown](https://milkdown.dev/) | 7.18.0 | WYSIWYG Markdown editor |
| [Vue I18n](https://vue-i18n.intlify.dev/) | 9.14.5 | Internationalization support |
| [electron-builder](https://www.electron.build/) | 24.13.3 | Packaging and distribution |

---

Made with love by [SlimNote Team](https://github.com/chengrady)

[Back to Top](#slimnote)

</div>
