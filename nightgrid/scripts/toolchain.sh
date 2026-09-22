#!/usr/bin/env bash
# Installs everything Nightgrid needs to build an Android APK:
# the Godot 4.3 headless editor, its export templates, the Android SDK
# pieces the non-Gradle export path uses (apksigner + zipalign) and a debug
# keystore. Idempotent — re-running only fetches what is missing.
set -euo pipefail

GODOT_VERSION="${GODOT_VERSION:-4.3-stable}"
GODOT_DIR="${GODOT_DIR:-$HOME/.local/opt/godot}"
GODOT_BIN="$GODOT_DIR/godot"
TEMPLATES_DIR="$HOME/.local/share/godot/export_templates/${GODOT_VERSION/-/.}"
ANDROID_SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/.local/opt/android-sdk}}"
BUILD_TOOLS="${BUILD_TOOLS:-34.0.0}"
PLATFORM="${PLATFORM:-android-34}"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
BASE_URL="https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}"

say() { printf '\n== %s\n' "$1"; }

say "Godot editor"
if [ ! -x "$GODOT_BIN" ]; then
  mkdir -p "$GODOT_DIR"
  tmp="$(mktemp -d)"
  curl -sSL --retry 3 -o "$tmp/godot.zip" \
    "$BASE_URL/Godot_v${GODOT_VERSION}_linux.x86_64.zip"
  unzip -q -o "$tmp/godot.zip" -d "$tmp"
  mv "$tmp/Godot_v${GODOT_VERSION}_linux.x86_64" "$GODOT_BIN"
  chmod +x "$GODOT_BIN"
  rm -rf "$tmp"
fi
"$GODOT_BIN" --headless --version

say "Export templates"
if [ ! -f "$TEMPLATES_DIR/android_debug.apk" ]; then
  mkdir -p "$(dirname "$TEMPLATES_DIR")"
  tmp="$(mktemp -d)"
  curl -sSL --retry 3 -o "$tmp/templates.tpz" \
    "$BASE_URL/Godot_v${GODOT_VERSION}_export_templates.tpz"
  unzip -q -o "$tmp/templates.tpz" -d "$tmp"
  rm -rf "$TEMPLATES_DIR"
  mv "$tmp/templates" "$TEMPLATES_DIR"
  rm -rf "$tmp"
fi
ls "$TEMPLATES_DIR/android_debug.apk" >/dev/null

say "Android SDK ($ANDROID_SDK)"
SDKMANAGER="$ANDROID_SDK/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$SDKMANAGER" ]; then
  mkdir -p "$ANDROID_SDK/cmdline-tools"
  tmp="$(mktemp -d)"
  curl -sSL --retry 3 -o "$tmp/clt.zip" "$CMDLINE_TOOLS_URL"
  unzip -q -o "$tmp/clt.zip" -d "$ANDROID_SDK/cmdline-tools"
  mv "$ANDROID_SDK/cmdline-tools/cmdline-tools" "$ANDROID_SDK/cmdline-tools/latest"
  rm -rf "$tmp"
fi
if [ ! -x "$ANDROID_SDK/build-tools/$BUILD_TOOLS/apksigner" ]; then
  yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
  "$SDKMANAGER" "platform-tools" "build-tools;$BUILD_TOOLS" "platforms;$PLATFORM" >/dev/null
fi

say "Debug keystore"
KEYSTORE="$HOME/.android/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v -keystore "$KEYSTORE" -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 \
    -validity 10000 -dname "CN=Android Debug,O=Android,C=US" >/dev/null
fi

say "Godot editor settings"
# The export path needs the SDK location and the keystore, and neither can be
# stored in the project — they live in the per-machine editor settings.
SETTINGS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/godot"
mkdir -p "$SETTINGS_DIR"
SETTINGS="$SETTINGS_DIR/editor_settings-4.3.tres"
JAVA_SDK="${JAVA_HOME:-$(dirname "$(dirname "$(readlink -f "$(command -v javac || command -v java)")")")}"
python3 - "$SETTINGS" "$ANDROID_SDK" "$KEYSTORE" "$JAVA_SDK" <<'PY'
import sys, os, re
path, sdk, keystore, java = sys.argv[1:5]
wanted = {
    "export/android/android_sdk_path": '"%s"' % sdk,
    "export/android/debug_keystore": '"%s"' % keystore,
    "export/android/debug_keystore_user": '"androiddebugkey"',
    "export/android/debug_keystore_pass": '"android"',
    "export/android/java_sdk_path": '"%s"' % java,
}
lines = []
if os.path.exists(path):
    lines = open(path).read().splitlines()
else:
    lines = ['[gd_resource type="EditorSettings" format=3]', '', '[resource]']
out, seen = [], set()
for line in lines:
    key = line.split(" = ")[0].strip()
    if key in wanted:
        out.append("%s = %s" % (key, wanted[key]))
        seen.add(key)
    else:
        out.append(line)
for key, value in wanted.items():
    if key not in seen:
        out.append("%s = %s" % (key, value))
open(path, "w").write("\n".join(out) + "\n")
print("wrote", path)
PY

say "Ready"
echo "GODOT_BIN=$GODOT_BIN"
echo "ANDROID_SDK=$ANDROID_SDK"
