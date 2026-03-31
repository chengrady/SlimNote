# Changelog / 更新日志

All notable changes to this project will be documented in this file.

本项目的重要变更都会记录在这里。

The format is based on Keep a Changelog, and this project follows semantic versioning in practice.

格式参考 Keep a Changelog，并尽量按照语义化版本的方式维护。

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
