# Changelog / 更新日志

All notable changes to this project will be documented in this file.

本项目的重要变更都会记录在这里。

The format is based on Keep a Changelog, and this project follows semantic versioning in practice.

格式参考 Keep a Changelog，并尽量按照语义化版本的方式维护。

## [1.5.0] - 2026-05-21

### Added / 新增

- Added a configurable keyboard shortcut system with shared shortcut definitions, conflict detection, persistence, reset actions, and Settings UI.
- 新增可配置快捷键体系，包含统一快捷键定义、冲突检测、持久化、恢复默认和设置页管理入口。

- Added Markdown preview search and preview-side font-size adjustment with visual feedback.
- 新增 Markdown 预览内搜索，以及预览侧字号调整和浮层反馈。

- Added safer app-close confirmation and launch-file recovery so unsaved tabs and files opened from the OS are handled more predictably.
- 新增应用退出确认与启动文件恢复流程，提升未保存标签页和系统文件关联打开场景的可靠性。

- Added SQL line comment toggling from the toolbar and keyboard shortcut.
- 新增 SQL 行注释切换，支持工具栏按钮和快捷键触发。

### Changed / 调整

- Reworked Settings into a denser desktop layout and added shortcut categories, live preview refinements, and clearer file association guidance.
- 重构设置页为更紧凑的桌面端布局，并补充快捷键分类、即时预览细节和更清晰的文件关联说明。

- Improved tab handling with configurable unpinned-tab row limits, close-unpinned action, better batch-selection cleanup, and restored dirty untitled tabs across sessions.
- 优化标签页处理，支持未固定标签最大行数、关闭所有未固定标签页、批量选择清理，并可跨会话恢复未保存的无路径标签页。

- Simplified recent-file ordering and workspace/sidebar interactions, while keeping recent files and folder history easier to scan.
- 简化最近文件排序和工作台侧栏交互，让最近文件与文件夹历史更易浏览。

- Expanded language detection and language picker support for JSONC, Markdown variants, YAML, TOML, INI/config files, and richer log patterns.
- 扩展语言检测和语言选择器，补充 JSONC、Markdown 变体、YAML、TOML、INI/配置文件和更多日志格式识别。

- Refined shared surface, popover, hover, focus, and motion styles across the desktop UI.
- 统一桌面端界面的面板、弹层、悬停、焦点和动效样式。

### Fixed / 修复

- Fixed self-triggered file watcher prompts after saving by suppressing local write change events for a short window.
- 修复保存后本地写入触发文件监听提示的问题，通过短时间抑制自身写入事件避免误报。

- Fixed file association and second-instance opening paths by persisting pending open files and flushing them after the renderer is ready.
- 修复文件关联和第二实例打开路径处理，通过持久化待打开文件并在渲染端就绪后补发，避免启动文件丢失。

- Fixed preview search routing so find/replace shortcuts open Markdown preview search when preview-only focus is active.
- 修复预览聚焦场景下查找/替换快捷键路由，使其优先打开 Markdown 预览搜索。

### Security / 安全

- Sanitized Markdown preview and Markdown PDF HTML output to block unsafe tags, event handlers, inline styles, and unsafe URLs.
- 对 Markdown 预览和 Markdown PDF HTML 输出增加净化处理，阻止危险标签、事件属性、内联样式和不安全 URL。

### Build / 构建

- Bumped the app version to `1.5.0` and included `src/shared` in packaged files for the shared shortcut registry.
- 将应用版本提升到 `1.5.0`，并把 `src/shared` 纳入打包文件，确保共享快捷键注册表随应用发布。

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
