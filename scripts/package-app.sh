#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/dist/Digital Pet.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
CACHE_DIR="$ROOT_DIR/.build/local-cache"

if [[ -n "${SHIRO_SDK:-}" ]]; then
    SDK_PATH="$SHIRO_SDK"
elif [[ -d /Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk ]]; then
    # Some Command Line Tools updates ship a compiler newer than the default SDK.
    SDK_PATH=/Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk
else
    SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"
fi

cd "$ROOT_DIR"
mkdir -p "$CACHE_DIR/home" "$CACHE_DIR/modules"

export HOME="$CACHE_DIR/home"
export CLANG_MODULE_CACHE_PATH="$CACHE_DIR/modules"
export SWIFTPM_MODULECACHE_OVERRIDE="$CACHE_DIR/modules"
export SDKROOT="$SDK_PATH"

swift build --disable-sandbox -c release --sdk "$SDK_PATH"
BIN_DIR="$(swift build --disable-sandbox -c release --sdk "$SDK_PATH" --show-bin-path)"

rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR"
cp "$BIN_DIR/ShiroPet" "$MACOS_DIR/ShiroPet"

cat > "$CONTENTS_DIR/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>Digital Pet</string>
    <key>CFBundleExecutable</key>
    <string>ShiroPet</string>
    <key>CFBundleIdentifier</key>
    <string>com.shiro.digitalpet</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Digital Pet</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

codesign --force --deep --sign - "$APP_DIR"
echo "Created $APP_DIR"
