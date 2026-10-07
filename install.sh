#!/bin/bash
# MD Viewer installer for macOS and Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/RicSchonfelder/MD-Viewer/master/install.sh | bash

set -e

REPO="RicSchonfelder/MD-Viewer"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

echo -e "\033[35mMD Viewer Installer\033[0m"
echo -e "\033[36mChecking latest version...\033[0m"

# Detect OS and architecture
case "$(uname -s)" in
  Darwin) OS="macos" ;;
  Linux)  OS="linux" ;;
  *)      echo -e "\033[31mUnsupported OS: $(uname -s)\033[0m"; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="aarch64" ;;
  *) echo -e "\033[31mUnsupported architecture: $(uname -m)\033[0m"; exit 1 ;;
esac

# Check deps
if ! command -v curl &>/dev/null; then
  echo -e "\033[31mcurl is required but not installed.\033[0m" >&2
  exit 1
fi

# Fetch latest release
RELEASE_JSON=$(curl -fsSL "$API_URL")
TAG=$(echo "$RELEASE_JSON" | grep -oE '"tag_name": *"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "\033[32mLatest version: $TAG\033[0m"
if [ -z "$TAG" ]; then
  echo -e "\033[31mFailed to fetch latest version info.\033[0m" >&2
  exit 1
fi

if [ "$OS" = "macos" ]; then
  ASSET_FILTER='.assets[] | select(.name | endswith(".dmg")) | .browser_download_url'
  INSTALLER_URL=$(echo "$RELEASE_JSON" | grep -oE '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)
  if [ -z "$INSTALLER_URL" ]; then
    echo -e "\033[31mNo macOS installer found in latest release.\033[0m" >&2
    exit 1
  fi
  TMP_DIR=$(mktemp -d)
  DMG_PATH="$TMP_DIR/MD-Viewer-$TAG.dmg"
  echo -e "\033[36mDownloading MD Viewer...\033[0m"
  curl -fsSL -o "$DMG_PATH" "$INSTALLER_URL"
  echo -e "\033[36mInstalling...\033[0m"
  VOLUME=$(hdiutil attach "$DMG_PATH" -nobrowse | tail -1 | cut -f3)
  cp -R "$VOLUME/MD Viewer.app" /Applications/
  hdiutil detach "$VOLUME" -quiet
  rm -rf "$TMP_DIR"
  echo -e "\033[32mMD Viewer $TAG installed to /Applications/MD Viewer.app\033[0m"
elif [ "$OS" = "linux" ]; then
  # Try AppImage first, then deb
  INSTALLER_URL=$(echo "$RELEASE_JSON" | grep -oE '"browser_download_url": *"[^"]*\.AppImage"' | head -1 | cut -d'"' -f4)
  if [ -n "$INSTALLER_URL" ]; then
    DEST="$HOME/Applications/MD-Viewer.AppImage"
    APP_NAME="md-viewer"
    APPS_DIR="$HOME/.local/share/applications"
    ICONS_DIR="$HOME/.local/share/icons/hicolor"
    DOCS_DIR="$HOME/.local/share/applications"
    mkdir -p "$HOME/Applications" "$APPS_DIR" "$ICONS_DIR" "$HOME/.config"

    echo -e "\033[36mDownloading MD Viewer...\033[0m"
    curl -fsSL -o "$DEST" "$INSTALLER_URL"
    chmod +x "$DEST"

    # --- Desktop integration: menu entry, app icon and .md file association ---
    TMP_X=$(mktemp -d)
    ( cd "$TMP_X" && "$DEST" --appimage-extract >/dev/null 2>&1 || true )

    ICON_SRC=""
    for cand in \
        "$TMP_X/squashfs-root/md-viewer.png" \
        "$TMP_X"/squashfs-root/usr/share/icons/hicolor/*/apps/md-viewer.png; do
      if [ -f "$cand" ]; then ICON_SRC="$cand"; break; fi
    done

    if [ -n "$ICON_SRC" ]; then
      for s in 32 48 64 128 256; do
        mkdir -p "$ICONS_DIR/${s}x${s}/apps" "$ICONS_DIR/${s}x${s}/mimetypes"
        [ "$s" = "256" ] || cp "$ICON_SRC" "$ICONS_DIR/${s}x${s}/apps/${APP_NAME}.png"
        cp "$ICON_SRC" "$ICONS_DIR/${s}x${s}/mimetypes/text-markdown.png"
        cp "$ICON_SRC" "$ICONS_DIR/${s}x${s}/mimetypes/text-x-markdown.png"
      done
      if [ ! -f "$ICONS_DIR/index.theme" ]; then
        cat > "$ICONS_DIR/index.theme" <<'THEME'
[Icon Theme]
Name=Hicolor (local)
Comment=Fallback theme
Inherits=hicolor
THEME
      fi
      command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -t "$ICONS_DIR" >/dev/null 2>&1 || true
    fi

    cat > "$APPS_DIR/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=MD Viewer
Comment=Visualizador Markdown (somente leitura)
Exec="$DEST" %F
Icon=${APP_NAME}
Terminal=false
Categories=Utility;TextEditor;Viewer;
MimeType=text/markdown;text/x-markdown;
StartupWMClass=${APP_NAME}
EOF
    chmod +x "$APPS_DIR/${APP_NAME}.desktop"

    # Make MD Viewer the default handler for .md (config + data home, no clobber)
    register_mime() {
      local file="$1" tmp
      touch "$file"
      tmp="${file}.tmp"
      awk '
        /^(text\/markdown|text\/x-markdown)=/ { next }
        { print }
      ' "$file" > "$tmp"
      awk '
        BEGIN { printed_def=0; printed_add=0 }
        {
          if ($0 == "[Default Applications]") {
            print
            print "text/markdown=md-viewer.desktop"
            print "text/x-markdown=md-viewer.desktop"
            printed_def=1
            next
          }
          if ($0 == "[Added Associations]") {
            print
            print "text/markdown=md-viewer.desktop;"
            print "text/x-markdown=md-viewer.desktop;"
            printed_add=1
            next
          }
          print
        }
        END {
          if (!printed_def) {
            print "[Default Applications]"
            print "text/markdown=md-viewer.desktop"
            print "text/x-markdown=md-viewer.desktop"
          }
          if (!printed_add) {
            print "[Added Associations]"
            print "text/markdown=md-viewer.desktop;"
            print "text/x-markdown=md-viewer.desktop;"
          }
        }
      ' "$tmp" > "$file"
      rm -f "$tmp"
    }
    register_mime "$HOME/.config/mimeapps.list"
    register_mime "$DOCS_DIR/mimeapps.list"

    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
    rm -rf "$TMP_X"

    echo -e "\033[32mMD Viewer $TAG installed to $DEST\033[0m"
    echo -e "\033[32mFile association registered: .md files now open with MD Viewer\033[0m"
    echo -e "\033[36mHint: restart your file manager if icons don't refresh.\033[0m"
  else
    DEB_URL=$(echo "$RELEASE_JSON" | grep -oE '"browser_download_url": *"[^"]*\.deb"' | head -1 | cut -d'"' -f4)
    if [ -z "$DEB_URL" ]; then
      echo -e "\033[31mNo Linux installer found in latest release.\033[0m" >&2
      exit 1
    fi
    TMP_DIR=$(mktemp -d)
    DEB_PATH="$TMP_DIR/MD-Viewer-$TAG.deb"
    echo -e "\033[36mDownloading MD Viewer...\033[0m"
    curl -fsSL -o "$DEB_PATH" "$DEB_URL"
    echo -e "\033[36mInstalling (may request sudo)...\033[0m"
    sudo dpkg -i "$DEB_PATH" || sudo apt-get install -f -y
    rm -rf "$TMP_DIR"
    echo -e "\033[32mMD Viewer $TAG installed!\033[0m"
  fi
fi
