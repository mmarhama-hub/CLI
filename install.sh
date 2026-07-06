#!/bin/sh
# Plugsky CLI installer:  curl -fsSL https://plugsky.com/install | sh
set -eu

REPO="coinplannet/plugskyCLI"
BIN="plugsky"
INSTALL_DIR="${PLUGSKY_INSTALL_DIR:-$HOME/.plugsky/bin}"

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
case "$os" in
  linux)  os=linux ;;
  darwin) os=darwin ;;
  *) echo "Unsupported OS: $os" >&2; exit 1 ;;
esac
case "$arch" in
  x86_64|amd64) arch=x64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) echo "Unsupported arch: $arch" >&2; exit 1 ;;
esac

asset="${BIN}-${os}-${arch}"
url="https://github.com/${REPO}/releases/latest/download/${asset}"

echo "Downloading ${asset} ..."
mkdir -p "$INSTALL_DIR"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$url" -o "$INSTALL_DIR/$BIN"
else
  wget -qO "$INSTALL_DIR/$BIN" "$url"
fi
chmod +x "$INSTALL_DIR/$BIN"

add_path() {
  profile="$1"; line="export PATH=\"$INSTALL_DIR:\$PATH\""
  [ -f "$profile" ] || return 0
  grep -qF "$INSTALL_DIR" "$profile" 2>/dev/null || printf '\n%s\n' "$line" >> "$profile"
}
add_path "$HOME/.bashrc"
add_path "$HOME/.zshrc"
add_path "$HOME/.profile"

echo ""
echo "Installed to $INSTALL_DIR/$BIN"
echo "  Open a new terminal (or: export PATH=\"$INSTALL_DIR:\$PATH\")"
echo "  Then run:  plugsky login"
