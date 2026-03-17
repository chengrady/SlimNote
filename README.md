<div align="center">

<img src="public/logo.svg" alt="SlimNote Logo" width="120" height="120">

# SlimNote

**A Modern Cross-Platform Text & Code Editor**
**一个现代化的跨平台文本与代码编辑器**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/chengrady/SlimNote)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28-47848f?logo=electron)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.4-42b883?logo=vue.js)](https://vuejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

**English** | [**简体中文**](#简体中文)

</div>

---

## English

### 👀 Overview

SlimNote is a lightweight yet powerful text and code editor built with **Electron**, **Vue 3**, **Monaco Editor**, and **Milkdown**. It provides a seamless editing experience for both code and Markdown documents.

### ✨ Features

#### 🖥️ Code Editor (Monaco)
- Syntax highlighting for 50+ languages
- Intelligent code completion
- Code folding & minimap
- Multi-cursor editing
- Find & replace with regex support

#### 📝 Markdown Editor (Milkdown)
- WYSIWYG editing experience
- Real-time preview
- GFM (GitHub Flavored Markdown) support
- KaTeX math formulas
- Prism code highlighting
- Image upload support
- Export to PDF & Image

#### 🗂️ File Management
- Multi-tab editing
- File tree explorer
- Auto encoding detection
- Recent files list
- Auto-save support

#### 🛠️ Developer Tools
- **JSON Toolkit**: Format, compress, diff, tree view, schema generation, repair, JMESPath query
- **SQL Toolkit**: Format with multiple dialects support
- **Markdown Toolkit**: Export to PDF & Image

#### 🎨 User Experience
- Light/Dark theme switching
- Resizable sidebar
- Pin floating window (always on top)
- Status bar with file info
- Customizable editor settings

### 📦 Installation

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| Windows | `.exe` (Installer) / `.exe` (Portable) |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

### 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/chengrady/SlimNote.git

# Navigate to directory
cd SlimNote

# Install dependencies
npm install

# Start development server
npm run dev
```

### 🔨 Build

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux

# Build for all platforms
npm run build
```

Build artifacts will be in the `release` directory.

### 📁 Supported File Formats

| Category | Extensions |
|----------|------------|
| Text | txt, text, md, markdown, mdx, log |
| Data | json, jsonc, yaml, yml, xml, toml, csv, tsv |
| Config | ini, conf, config, properties |
| Web | html, htm, css, scss, sass, less, js, ts, jsx, tsx, vue |
| Programming | py, java, c, cpp, cs, sh, bash, ps1, bat, sql |

### ⌨️ Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New File | Ctrl+N | Cmd+N |
| Open File | Ctrl+O | Cmd+O |
| Open Folder | Ctrl+Shift+O | Cmd+Shift+O |
| Save | Ctrl+S | Cmd+S |
| Save As | Ctrl+Shift+S | Cmd+Shift+S |
| Find | Ctrl+F | Cmd+F |
| Replace | Ctrl+H | Cmd+H |
| Toggle Theme | Ctrl+T | Cmd+T |
| Developer Tools | F12 | F12 |

### 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 简体中文

[**English**](#english) | **简体中文**

### 👀 项目简介

SlimNote 是一个基于 **Electron**、**Vue 3**、**Monaco Editor** 和 **Milkdown** 构建的轻量级文本与代码编辑器，为代码和 Markdown 文档提供流畅的编辑体验。

### ✨ 功能特性

#### 🖥️ 代码编辑器 (Monaco)
- 支持 50+ 种语言的语法高亮
- 智能代码补全
- 代码折叠与小地图
- 多光标编辑
- 支持正则表达式的查找替换

#### 📝 Markdown 编辑器 (Milkdown)
- 所见即所得的编辑体验
- 实时预览
- GFM (GitHub Flavored Markdown) 支持
- KaTeX 数学公式
- Prism 代码高亮
- 图片上传支持
- 导出为 PDF 和图片

#### 🗂️ 文件管理
- 多标签页编辑
- 文件树浏览器
- 自动检测文件编码
- 最近打开文件列表
- 自动保存支持

#### 🛠️ 开发工具
- **JSON 工具箱**：格式化、压缩、Diff 对比、树形视图、Schema 生成、修复、JMESPath 查询
- **SQL 工具箱**：支持多种方言的格式化
- **Markdown 工具箱**：导出为 PDF 和图片

#### 🎨 用户体验
- 浅色/深色主题切换
- 可调整侧边栏
- Pin 浮动窗口（始终置顶）
- 状态栏显示文件信息
- 可自定义编辑器设置

### 📦 安装

下载适合您平台的最新版本：

| 平台 | 下载 |
|------|------|
| Windows | `.exe` (安装包) / `.exe` (便携版) |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

### 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/chengrady/SlimNote.git

# 进入目录
cd SlimNote

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 🔨 构建

```bash
# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux

# 构建所有平台
npm run build
```

构建产物位于 `release` 目录。

### 📁 支持的文件格式

| 类型 | 扩展名 |
|------|--------|
| 文本 | txt, text, md, markdown, mdx, log |
| 数据 | json, jsonc, yaml, yml, xml, toml, csv, tsv |
| 配置 | ini, conf, config, properties |
| Web | html, htm, css, scss, sass, less, js, ts, jsx, tsx, vue |
| 编程 | py, java, c, cpp, cs, sh, bash, ps1, bat, sql |

### ⌨️ 快捷键

| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 新建文件 | Ctrl+N | Cmd+N |
| 打开文件 | Ctrl+O | Cmd+O |
| 打开文件夹 | Ctrl+Shift+O | Cmd+Shift+O |
| 保存 | Ctrl+S | Cmd+S |
| 另存为 | Ctrl+Shift+S | Cmd+Shift+S |
| 查找 | Ctrl+F | Cmd+F |
| 替换 | Ctrl+H | Cmd+H |
| 切换主题 | Ctrl+T | Cmd+T |
| 开发者工具 | F12 | F12 |

### 🗺️ 开发路线

- [ ] 全局搜索功能
- [ ] 代码片段管理
- [ ] 自定义快捷键
- [ ] 插件系统
- [ ] Git 集成
- [ ] 终端集成
- [ ] 远程文件编辑 (SSH/FTP)
- [ ] 协作编辑

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

<div align="center">

## 🛠️ Tech Stack

| Technology | Version | Description |
|------------|---------|-------------|
| [Electron](https://www.electronjs.org/) | 28 | Cross-platform desktop framework |
| [Vue](https://vuejs.org/) | 3.4 | Progressive JavaScript framework |
| [Vite](https://vitejs.dev/) | 5 | Next generation frontend tooling |
| [Pinia](https://pinia.vuejs.org/) | 2.1 | Vue state management |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | 0.47 | Code editor (VS Code engine) |
| [Milkdown](https://milkdown.dev/) | 7.18 | WYSIWYG Markdown editor |

---

Made with ❤️ by [SlimNote Team](https://github.com/chengrady)

[⬆ Back to Top](#slimnote)

</div>
