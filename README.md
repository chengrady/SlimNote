# SlimNote

一个基于 Electron 和 Vue 3 构建的跨平台文本编辑器。

## 功能特性

### 核心功能
- ✅ 多标签页编辑
- ✅ 文件和文件夹管理
- ✅ 支持多种文件格式（txt, markdown, json, xml, html, css, js, ts等）
- ✅ 语法高亮
- ✅ 自动保存
- ✅ 文件编码检测与转换
- ✅ 最近打开文件列表

### 编辑器功能
- ✅ Monaco Editor 集成（VS Code同款编辑器）
- ✅ 代码自动完成
- ✅ 代码格式化
- ✅ 撤销/重做
- ✅ 查找替换
- ✅ 行号显示
- ✅ 代码折叠
- ✅ 小地图

### 界面功能
- ✅ 浅色/深色主题切换
- ✅ 可调整的侧边栏宽度
- ✅ 文件资源管理器
- ✅ 状态栏显示文件信息
- ✅ 可自定义字体、字号等编辑器设置

### 高级功能
- ✅ Pin 浮动窗口功能
- ✅ 文件变更监控
- ✅ 在文件夹中显示文件

## 技术栈

- **框架**: Electron 29
- **前端**: Vue 3 + Composition API
- **构建工具**: Vite 5
- **状态管理**: Pinia
- **编辑器**: Monaco Editor
- **语言**: TypeScript
- **打包工具**: electron-builder

## 开发环境设置

### 前置要求
- Node.js >= 18
- npm >= 9

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发模式运行

\`\`\`bash
npm run electron:dev
\`\`\`

这将启动 Vite 开发服务器和 Electron 应用。

### 构建应用

构建所有平台：
\`\`\`bash
npm run build
\`\`\`

构建特定平台：
\`\`\`bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
\`\`\`

构建产物将在 \`release\` 目录中。

## 项目结构

\`\`\`
SlimNote/
├── electron/           # Electron 主进程代码
│   ├── main.ts        # 主进程入口
│   ├── preload.ts     # 预加载脚本
│   └── types.d.ts     # 类型定义
├── src/               # Vue 前端代码
│   ├── components/    # Vue 组件
│   │   ├── EditorPanel.vue
│   │   ├── FileExplorer.vue
│   │   ├── FileNode.vue
│   │   ├── MonacoEditor.vue
│   │   ├── StatusBar.vue
│   │   └── TabBar.vue
│   ├── stores/        # Pinia 状态管理
│   │   ├── editor.ts
│   │   ├── file.ts
│   │   └── settings.ts
│   ├── views/         # 页面视图
│   │   ├── MainEditor.vue
│   │   └── PinWindow.vue
│   ├── router/        # 路由配置
│   │   └── index.ts
│   ├── App.vue        # 根组件
│   ├── main.ts        # 前端入口
│   └── style.css      # 全局样式
├── package.json       # 项目配置
├── tsconfig.json      # TypeScript 配置
├── vite.config.ts     # Vite 配置
└── README.md          # 项目文档
\`\`\`

## 快捷键

| 功能 | Windows/Linux | macOS |
|------|--------------|-------|
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

## 功能说明

### 文件操作
- 支持打开单个文件或整个文件夹
- 文件变更自动检测
- 多标签页同时编辑多个文件
- 未保存的更改会有标记提示

### 编辑器设置
通过修改设置可以自定义：
- 主题（浅色/深色）
- 字体大小
- 字体系列
- 制表符大小
- 自动保存
- 行号显示
- 代码小地图
- 自动换行

设置会保存在本地存储中，重启应用后保持。

### Pin 窗口
选中文本后可以创建 Pin 浮动窗口，将选中内容置顶显示，方便参考。

## 待实现功能

- [ ] Markdown 实时预览
- [ ] Markdown 导出 PDF
- [ ] 搜索替换功能（全局/当前文件）
- [ ] 文本工具（URL编码、Base64、JSON格式化等）
- [ ] 自定义快捷键
- [ ] 代码片段
- [ ] 插件系统
- [ ] Git 集成
- [ ] 终端集成

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-12-24)
- 初始版本发布
- 基础文本编辑功能
- 多标签页管理
- 文件资源管理器
- 主题切换
- Monaco Editor 集成
