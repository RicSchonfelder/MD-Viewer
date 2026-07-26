# MD Viewer

A **cross-platform** desktop Markdown file viewer. Read-only — just view, no editing.

![GitHub](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![GitHub](https://img.shields.io/badge/built%20with-Tauri%202%20%2B%20Vite-green)

## Features

- Full Markdown rendering (GFM tables, task lists, fenced code blocks, blockquotes, images)
- Syntax-highlighted code blocks (JavaScript, TypeScript, Python, Rust, Go, Bash, SQL, CSS, HTML, JSON)
- Dark & light themes (auto-detects system preference, toggleable)
- Open files via:
  - File dialog (Ctrl+O)
  - Drag-and-drop
  - Double-click .md files (file association)
  - Right-click → "Open with MD Viewer"
- Relative image/video path resolution
- Clean, distraction-free interface

## Download

Grab the latest installer from [Releases](https://github.com/RicSchonfelder/MD-Viewer/releases):

| Platform | Installer |
|----------|-----------|
| Windows  | `.msi` or `.exe` |
| macOS    | `.dmg` |
| Linux    | `.AppImage` or `.deb` |

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) 1.77+
- [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/)

### Build

```bash
git clone https://github.com/RicSchonfelder/MD-Viewer.git
cd MD-Viewer
npm install
npm run tauri build
```

Build artifacts will be in `src-tauri/target/release/bundle/`.

## Development

```bash
npm install
npm run tauri dev
```

## Tech Stack

- **Frontend:** Vanilla JavaScript, CSS custom properties
- **Rendering:** [marked](https://marked.js.org/) + [highlight.js](https://highlightjs.org/)
- **Desktop:** [Tauri v2](https://v2.tauri.app/) (Rust + WebView)
- **Build:** [Vite](https://vitejs.dev/)

## License

MIT
