# MD Viewer

A **cross-platform** desktop Markdown file viewer. Read-only — no editing, just viewing.

![screenshot](docs/screenshot.png)

## Features

- Renders Markdown files with syntax-highlighted code blocks
- Drag-and-drop support
- File association: open `.md` files directly by double-clicking
- Right-click "Open with MD Viewer" context menu integration
- Dark & light themes
- Native file dialog

## Supported Platforms

| Platform | Installer |
|----------|-----------|
| Windows  | MSI / NSIS |
| macOS    | DMG |
| Linux    | AppImage / deb |

## Build from source

```bash
npm install
npm run tauri build
```

The installer will be in `src-tauri/target/release/bundle/`.

## License

MIT
