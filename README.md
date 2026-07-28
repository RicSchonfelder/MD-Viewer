<div align="center">
  <img src="src-tauri/icons/icon.png" alt="MD Viewer" width="128" height="128"/>
  <h1 align="center">MD Viewer</h1>
  <p align="center">
    A lightweight, cross-platform desktop Markdown file viewer.
    <br/>
    <strong>Read-only. No editing. Just viewing.</strong>
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#download">Download</a> •
    <a href="#usage">Usage</a> •
    <a href="#build-from-source">Build</a> •
    <a href="#tech-stack">Tech Stack</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square"/>
    <img src="https://img.shields.io/badge/built%20with-Tauri%202%20%2B%20Vite-22c55e?style=flat-square"/>
    <img src="https://img.shields.io/github/v/release/RicSchonfelder/MD-Viewer?style=flat-square"/>
    <img src="https://img.shields.io/github/license/RicSchonfelder/MD-Viewer?style=flat-square"/>
  </p>
</div>

---

## Features

- **Full GFM Markdown Rendering** — headings, tables, task lists, fenced code blocks, blockquotes, images, videos, and more
- **Syntax Highlighting** — JavaScript, TypeScript, Python, Rust, Go, Bash, SQL, CSS, HTML/XML, JSON
- **Dark & Light Themes** — auto-detects your system preference; toggle anytime
- **Multiple Open Methods:**
  - Native file dialog (`Ctrl+O`)
  - Drag & drop files onto the window
  - Double-click any `.md` file (file association)
  - Right-click → "Open with MD Viewer"
- **Relative Path Resolution** — images and links relative to the Markdown file work out of the box
- **Clean Interface** — distraction-free reading with a minimal toolbar
- **Native Performance** — built on Tauri (WebView2 on Windows, WebKit on macOS/Linux)

## Download

Get the latest installer from the [Releases page](https://github.com/RicSchonfelder/MD-Viewer/releases).

| Platform | Format | Size |
|----------|--------|------|
| Windows  | `.exe` (NSIS) | ~2 MB |
| Windows  | `.msi` (WiX) | ~3 MB |
| macOS    | `.dmg` | ~5 MB |
| Linux    | `.AppImage` | ~5 MB |
| Linux    | `.deb` | ~3 MB |

### Installation

**Windows:** Run the `.exe` or `.msi` installer. File associations and context menu entries are automatically registered.

**macOS:** Mount the `.dmg` and drag `MD Viewer.app` to your Applications folder.

**Linux:** Make the `.AppImage` executable (`chmod +x`) and run, or install the `.deb` package with `sudo dpkg -i`.

### One-liner install

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/RicSchonfelder/MD-Viewer/master/install.ps1 | iex
```

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/RicSchonfelder/MD-Viewer/master/install.sh | bash
```

## Usage

| Action | How |
|--------|-----|
| Open a file | `Ctrl+O` or click **Open** in the toolbar |
| Open from file manager | Double-click any `.md` file |
| Open via drag & drop | Drag a `.md` file onto the window |
| Toggle theme | Click **Theme** in the toolbar |
| Open from terminal | `md-viewer path/to/file.md` |

### Setting as Default Program

After installation, right-click any `.md` file → **Open with** → **Choose another app** → select **MD Viewer** → check **Always use this app**.

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) 1.77+
- [Tauri v2 System Dependencies](https://v2.tauri.app/start/prerequisites/)

### Steps

```bash
# Clone the repository
git clone https://github.com/RicSchonfelder/MD-Viewer.git
cd MD-Viewer

# Install JavaScript dependencies
npm install

# Build the production application
npm run tauri build
```

Build artifacts will be at `src-tauri/target/release/bundle/`.

### Development

```bash
npm run tauri dev
```

This starts the Vite dev server and launches the app in development mode with hot-reload.

## Project Structure

```
MD-Viewer/
├── index.html                 # Vite entry point
├── vite.config.js             # Vite configuration
├── package.json
├── src/                       # Frontend source
│   ├── main.js                # Application entry (Tauri commands, events)
│   ├── renderer.js            # Markdown renderer (marked + highlight.js)
│   └── style.css              # Theme system (light + dark)
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs            # Windows subsystem entry point
│   │   └── lib.rs             # Tauri commands (read_file, get_cli_args)
│   ├── tauri.conf.json        # App config, file associations, bundler
│   ├── capabilities/          # Permission grants
│   └── icons/                 # Application icons
└── scripts/
    └── create-ico.mjs         # ICO icon generator
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend Build | [Vite](https://vitejs.dev/) |
| Markdown Parser | [marked](https://marked.js.org/) |
| Syntax Highlighting | [highlight.js](https://highlightjs.org/) |
| Native Dialogs | [tauri-plugin-dialog](https://github.com/tauri-apps/tauri-plugin-dialog) |

## Roadmap

- [ ] Print support
- [ ] Table of contents sidebar
- [ ] Find in page (`Ctrl+F`)
- [ ] Auto-reload on file change
- [ ] Mermaid diagram rendering
- [ ] Math (KaTeX) support

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ using Tauri and Rust</sub>
</div>
