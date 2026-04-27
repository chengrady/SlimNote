# Changelog / 更新日志

All notable changes to this project will be documented in this file.

本项目的重要变更都会记录在这里。

The format is based on Keep a Changelog, and this project follows semantic versioning in practice.

格式参考 Keep a Changelog，并尽量按照语义化版本的方式维护。

## [1.4.0] - 2026-04-27

### Added / 新增

- Added external file change detection with a reload prompt to avoid silently showing stale editor content when files are modified by other apps.
- 新增外部文件变更检测与重载提示，避免文件被其他程序修改后编辑器继续显示旧内容。

- Added Presentation Mode for focused reading and demos, with menu and keyboard shortcuts.
- 新增演示模式，支持通过菜单和快捷键进入，更适合沉浸阅读与展示。

- Added an Activity Bar for quick switching between Explorer and Recent views.
- 新增活动栏，可在资源管理器和最近视图之间快速切换。

### Changed / 调整

- Improved workspace layout, sidebar interactions, editor spacing, and desktop UI readability.
- 优化工作区布局、侧栏交互、编辑区间距和桌面端界面可读性。

- Improved tab organization by keeping pinned tabs ordered before regular tabs and restoring pinned state across sessions.
- 优化标签组织方式，让固定标签始终排列在普通标签前，并支持跨会话恢复固定状态。

- Refined title bar shortcuts and view-menu actions to include Presentation Mode.
- 统一标题栏快捷键展示，并在视图菜单中补充演示模式入口。

- Standardized Windows build artifact names for installer and portable packages.
- 统一 Windows 安装包和便携版产物文件名。

### Fixed / 修复

- Improved Markdown editing by automatically continuing list items after pressing Enter.
- 改进 Markdown 编辑体验，支持按回车后自动续写列表项。

- Improved file path handling for recent files, recent folders, saved files, and jump-to-location events.
- 优化最近文件、最近文件夹、另存文件和跳转定位事件中的文件路径处理。

### Docs / 文档

- Updated `README.md` for `1.4.0` features, shortcuts, and build artifact names.
- 更新 `README.md` 中的 `1.4.0` 功能说明、快捷键和构建产物文件名。

## [1.3.1] - 2026-04-08

### Added / 新增

- Added Help menu actions for checking updates and opening About.
- 新增帮助菜单入口，用于检查更新和打开 About。

- Added Markdown preview selection actions for plain-text copy and copy to Word/WeChat.
- 新增 Markdown 预览选区操作，支持复制纯文本和复制到 Word/微信。

- Added a Unicode highlight toggle in editor settings, disabled by default for new installs.
- 在编辑器设置中新增 Unicode 字符提示开关，并将新安装默认值设为关闭。

### Changed / 调整

- Reworked Settings into a VS Code-style layout with global search, a direct font-size input, and About moved under Help.
- 将设置页改为更接近 VS Code 的布局，支持全局搜索、直接输入字号，并将 About 收纳到帮助入口。

- Unified and expanded font and language pickers across Settings and the status bar, with alphabetical sorting, icons, and roomier popups.
- 统一并扩充了设置页与状态栏中的字体、语言列表，补充字母排序、图标和更易点选的弹层尺寸。

- Improved dark-theme readability and selected states across menus, tabs, outline, recent files, search results, and side panels.
- 提升深色主题下菜单、标签、目录、最近文件、搜索结果和侧栏区域的可读性与选中态表现。

- Improved JSON tree rendering so long values wrap instead of truncating with ellipsis.
- 优化 JSON 树预览，长文本改为自动换行显示，不再以省略号截断。

### Fixed / 修复

- Fixed Markdown rich copy so ordered and nested lists paste more reliably into Word/WeChat.
- 修复 Markdown 富文本复制后在 Word/微信中有序列表和嵌套列表易丢失层级的问题。

- Fixed Markdown PDF export failures caused by missing list-prefix decoration wiring.
- 修复 Markdown 导出 PDF 时因列表前缀装饰逻辑缺失而导致的导出失败问题。

- Fixed blank pages in Mermaid-heavy Markdown PDF exports by refining Mermaid slice pagination behavior.
- 优化 Mermaid 分页切片策略，修复部分 Mermaid 较多的 Markdown 导出 PDF 时出现空白页的问题。

### Docs / 文档

- Updated `README.md` release highlights and Windows artifact names for `1.3.1`.
- 更新 `README.md` 中的 `1.3.1` 发版摘要和 Windows 产物文件名。

## [1.3.0] - 2026-03-31

### Added / 新增

- Added an About experience with project overview, version information, technology stack, and GitHub entry.
- 新增 About 页面，包含项目介绍、版本信息、技术栈和 GitHub 入口。

- Added grouped About content inside the Settings dialog.
- 在设置弹框中新增 About 分组内容。

- Added app-level custom title-bar menus for file, edit, and view actions.
- 新增应用级自定义标题栏菜单，覆盖文件、编辑和视图操作。

### Changed / 调整

- Unified dialog, card, button, spacing, and input styling across the main UI.
- 统一了主界面的弹框、卡片、按钮、间距和输入控件样式。

- Expanded the Settings dialog size and improved its internal layout to reduce unnecessary scrolling.
- 放大设置弹框并优化内部布局，尽量减少不必要的滚动。

- Refined workspace, welcome, tab-bar, and sidebar visual language to match the shared UI system.
- 调整工作区、欢迎页、标签栏和侧边栏的视觉语言，使其与统一 UI 体系保持一致。

- Simplified the workspace header actions and aligned the main desktop shell with the new menu structure.
- 精简工作区顶部操作区，并让主界面结构与新的菜单体系保持一致。

### Fixed / 修复

- Fixed dialogs triggered from the left workspace area so they open centered in the full app window.
- 修复从左侧工作区触发的弹框只在侧栏区域显示的问题，现在会在整个应用窗口中居中。

- Fixed garbled dialog close icon and completed missing localized tab-close prompt text.
- 修复弹框关闭图标乱码，并补齐标签页关闭确认相关的缺失本地化文案。

- Fixed several title-bar interaction issues by aligning click behavior and desktop window control wiring.
- 修复多个标题栏交互问题，重新梳理点击行为和桌面窗口控制链路。

- Fixed missing development preload APIs required by the new menu and About actions.
- 修复开发环境下新菜单和 About 功能依赖的 preload API 缺失问题。

### Docs / 文档

- Rewrote `README.md` to remove outdated content and reflect the current `1.3.0` feature set.
- 重写 `README.md`，移除过时内容并同步当前 `1.3.0` 功能说明。

- Added a root-level `CHANGELOG.md` for release tracking.
- 新增根目录 `CHANGELOG.md`，用于版本发布和变更跟踪。
