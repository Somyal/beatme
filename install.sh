#!/usr/bin/env bash
# BeatMe Linux Installation Script
# Run after a successful `npm run tauri build`
set -e

BINARY_SRC="src-tauri/target/release/BeatMe"
BINARY_DEST="/usr/local/bin/BeatMe"
ICON_SRC="src-tauri/icons/128x128.png"
ICON_DEST="/usr/share/icons/hicolor/128x128/apps/com.gautam.beatme.png"
DESKTOP_SYSTEM="/usr/share/applications/com.gautam.beatme.desktop"
DESKTOP_SRC="com.gautam.beatme.desktop"
AUTOSTART_DIR="$HOME/.config/autostart"
AUTOSTART_DEST="$AUTOSTART_DIR/com.gautam.beatme.desktop"

echo "=== BeatMe Installation ==="

# 1. Install binary
echo "[1/5] Installing binary to $BINARY_DEST"
sudo install -Dm755 "$BINARY_SRC" "$BINARY_DEST"

# 2. Install icon
echo "[2/5] Installing icon to $ICON_DEST"
sudo install -Dm644 "$ICON_SRC" "$ICON_DEST"
sudo gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true

# 3. Install system .desktop file (GNOME search / Super key)
echo "[3/5] Installing system .desktop file to $DESKTOP_SYSTEM"
sudo install -Dm644 "$DESKTOP_SRC" "$DESKTOP_SYSTEM"
sudo update-desktop-database /usr/share/applications 2>/dev/null || true

# 4. Create XDG autostart entry
echo "[4/5] Creating XDG autostart entry"
mkdir -p "$AUTOSTART_DIR"
cat > "$AUTOSTART_DEST" << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=BeatMe
Comment=BeatMe daily reflection — starts in background
Exec=/usr/local/bin/BeatMe --hidden
Icon=com.gautam.beatme
X-GNOME-Autostart-enabled=true
Hidden=false
NoDisplay=false
EOF

# 5. Validate
echo "[5/5] Validating .desktop files"
desktop-file-validate "$DESKTOP_SYSTEM" && echo "  ✓ System .desktop valid"
desktop-file-validate "$AUTOSTART_DEST" && echo "  ✓ Autostart .desktop valid"

echo ""
echo "=== Installation Complete ==="
echo "Binary:    $BINARY_DEST"
echo "Icon:      $ICON_DEST"
echo "Launcher:  $DESKTOP_SYSTEM"
echo "Autostart: $AUTOSTART_DEST"
echo ""
echo "BeatMe will now:"
echo "  • Appear in GNOME search (Super key → type 'BeatMe')"
echo "  • Start automatically at login (hidden in system tray)"
echo ""
echo "Log out and back in to activate autostart."
