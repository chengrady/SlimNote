# SlimNote

SlimNote is a lightweight desktop editor built with Electron, Vue 3, Monaco Editor, and Milkdown.

- Version: `1.3.0`
- Repository: [github.com/chengrady/SlimNote](https://github.com/chengrady/SlimNote)
- License: [MIT](LICENSE)

## Overview

SlimNote is designed for day-to-day work with Markdown, JSON, SQL, logs, and common text files. It combines a code-oriented editor, a Markdown editing experience, and several helper panels inside one desktop app.

## Highlights

- Monaco-based editing for code and structured text.
- Milkdown-based Markdown editing workflow.
- Workspace sidebar with folder browsing, recent files, and tabbed editing.
- Built-in helper panels for JSON conversion, JSON diff, Markdown export, and related tasks.
- Unified desktop UI across dialogs, cards, controls, menus, and settings.
- Native desktop capabilities such as system file dialogs, custom title bar, and pin window support.

## What's New in 1.3.0

- Unified dialog, card, button, spacing, and form-control styling across the app.
- Reworked the title-bar menus for file, edit, and view actions.
- Added an About experience with project overview, version, stack, and GitHub link.
- Expanded the Settings dialog and improved layout density to reduce unnecessary scrolling.
- Fixed modal centering issues for workspace-triggered dialogs.
- Filled in missing labels related to tab close prompts and newer UI entries.

## Supported File Types

| Category | Extensions |
| --- | --- |
| Text | `txt`, `text`, `log` |
| Markdown | `md`, `markdown`, `mdx` |
| Data | `json`, `jsonc`, `yaml`, `yml`, `xml`, `toml`, `csv`, `tsv` |
| Config | `ini`, `conf`, `config`, `properties` |
| Web | `html`, `htm`, `css`, `scss`, `sass`, `less`, `js`, `ts`, `jsx`, `tsx`, `vue` |
| Programming | `py`, `java`, `c`, `cpp`, `cs`, `sh`, `bash`, `ps1`, `bat`, `sql` |

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts the Electron app in development mode.

## Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# Default build
npm run build
```

Build artifacts are generated in the `release/` directory.

Typical Windows outputs:

- `release/SlimNote Setup 1.3.0.exe`
- `release/SlimNote 1.3.0.exe`
- `release/latest.yml`

## Common Shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| New File | `Ctrl+N` | `Cmd+N` |
| Open File | `Ctrl+O` | `Cmd+O` |
| Open Folder | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| Save | `Ctrl+S` | `Cmd+S` |
| Save As | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Find | `Ctrl+F` | `Cmd+F` |
| Replace | `Ctrl+H` | `Cmd+H` |
| Global Search | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Toggle Fullscreen | `F11` | `Ctrl+Cmd+F` |

## Release

- GitHub Releases: [github.com/chengrady/SlimNote/releases](https://github.com/chengrady/SlimNote/releases)
- Changelog: [CHANGELOG.md](CHANGELOG.md)

## Contributing

Issues and pull requests are welcome.

```bash
git checkout -b feature/your-feature
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

## License

SlimNote is released under the [MIT License](LICENSE).
