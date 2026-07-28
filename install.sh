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
TAG=$(echo "$RELEASE_JSON" | grep -o '"tag_name":"[^"]*"' | cut -d'"' -f4)
echo -e "\033[32mLatest version: $TAG\033[0m"

if [ "$OS" = "macos" ]; then
  ASSET_FILTER='.assets[] | select(.name | endswith(".dmg")) | .browser_download_url'
  INSTALLER_URL=$(echo "$RELEASE_JSON" | grep -o '"browser_download_url":"[^"]*\.dmg"' | cut -d'"' -f4)
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
  INSTALLER_URL=$(echo "$RELEASE_JSON" | grep -o '"browser_download_url":"[^"]*\.AppImage"' | cut -d'"' -f4)
  if [ -n "$INSTALLER_URL" ]; then
    DEST="$HOME/Applications/MD-Viewer.AppImage"
    mkdir -p "$HOME/Applications"
    echo -e "\033[36mDownloading MD Viewer...\033[0m"
    curl -fsSL -o "$DEST" "$INSTALLER_URL"
    chmod +x "$DEST"
    echo -e "\033[32mMD Viewer $TAG installed to $DEST\033[0m"
  else
    DEB_URL=$(echo "$RELEASE_JSON" | grep -o '"browser_download_url":"[^"]*\.deb"' | cut -d'"' -f4)
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
