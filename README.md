# SlimNote

<p align="center">
  <img src="public/logo.svg" alt="SlimNote Logo" width="120" height="120">
</p>

<p align="center">
  <strong>一个现代化的跨平台文本与代码编辑器</strong>
</p>

<p align="center">
  基于 Electron + Vue 3 + Monaco Editor + Milkdown 构建的轻量级编辑器
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.1-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Electron-28-green.svg" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3.4-brightgreen.svg" alt="Vue">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</p>

---

## 功能特性

### 编辑器核心

- **Monaco Editor** - VS Code 同款编辑器引擎
  - 语法高亮（支持 50+ 种语言）
  - 代码自动补全
  - 代码折叠
  - 小地图预览
  - 多光标编辑
  - 查找替换

- **Milkdown Markdown 编辑器**
  - 所见即所得的 Markdown 编辑体验
  - 实时预览
  - GFM (GitHub Flavored Markdown) 支持
  - 数学公式 (KaTeX)
  - 代码块语法高亮 (Prism)
  - 图片上传支持

### 文件管理

- 多标签页编辑
- 文件树浏览器
- 支持多种文件格式
- 文件编码自动检测
- 最近打开文件列表
- 自动保存

### 实用工具

- **JSON 工具**
  - JSON 格式化
  - JSON 压缩
  - JSON Diff 对比
  - JSON 树形视图
  - JSON Schema 生成
  - JSON 修复
  - JMESPath 查询

- **SQL 工具**
  - SQL 格式化
  - 支持多种 SQL 方言

- **Markdown 工具**
  - 导出为 PDF
  - 导出为图片

### 界面体验

- 浅色/深色主题切换
- 可调整侧边栏
- Pin 浮动窗口（置顶显示选中内容）
- 状态栏显示文件信息
- 自定义编辑器设置（字体、字号、Tab 宽度等）

## 支持的文件格式

| 类型 | 扩展名 |
|------|--------|
| 文本 | txt, text, md, markdown, mdx, log |
| 数据 | json, jsonc, yaml, yml, xml, toml, csv, tsv |
| 配置 | ini, conf, config, properties |
| Web | html, htm, css, scss, sass, less, js, ts, jsx, tsx, vue |
| 编程 | py, java, c, cpp, cs, sh, bash, ps1, bat, sql |

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Electron | 28 | 跨平台桌面应用框架 |
| Vue | 3.4 | 渐进式 JavaScript 框架 |
| Vite | 5 | 下一代前端构建工具 |
| Pinia | 2.1 | Vue 状态管理 |
| Monaco Editor | 0.47 | 代码编辑器 |
| Milkdown | 7.18 | Markdown 编辑器 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆仓库
git clone https://github.com/chengrady/SlimNote.git

# 进入目录
cd SlimNote

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发模式
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

# 构建所有平台
npm run build
```

构建产物位于 `release` 目录。

## 项目结构

```
SlimNote/
├── electron/              # Electron 主进程
│   ├── main.js           # 主进程入口
│   ├── preload.js        # 预加载脚本
│   └── main-new.js       # 新版主进程（开发中）
├── src/
│   ├── main/             # 主进程源码
│   ├── preload/          # 预加载脚本源码
│   ├── renderer/         # 渲染进程（Vue 应用）
│   │   ├── components/   # Vue 组件
│   │   ├── views/        # 页面视图
│   │   ├── stores/       # Pinia 状态管理
│   │   ├── router/       # 路由配置
│   │   └── utils/        # 工具函数
│   └── ...
├── public/               # 静态资源
├── package.json          # 项目配置
├── vite.config.js        # Vite 配置
└── electron.vite.config.ts  # Electron Vite 配置
```

## 快捷键

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
| 撤销 | Ctrl+Z | Cmd+Z |
| 重做 | Ctrl+Y | Cmd+Y |
| 开发者工具 | F12 | F12 |
| 退出 | Ctrl+Q | Cmd+Q |

## 开发计划

- [ ] 全局搜索功能
- [ ] 代码片段管理
- [ ] 自定义快捷键
- [ ] 插件系统
- [ ] Git 集成
- [ ] 终端集成
- [ ] 远程文件编辑 (SSH/FTP)
- [ ] 协作编辑

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式

如有问题或建议，欢迎在 [Issues](https://github.com/chengrady/SlimNote/issues) 中提出。

---

<p align="center">
  Made with ❤️ by SlimNote Team
</p>
