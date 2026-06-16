#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="${1:-"$ROOT_DIR/.pages"}"
WEB_DIR="$ROOT_DIR/web"

if [[ "$OUTPUT_DIR" != /* ]]; then
  OUTPUT_DIR="$ROOT_DIR/$OUTPUT_DIR"
fi

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/downloads"

cp "$WEB_DIR/demo/index.html" "$OUTPUT_DIR/index.html"
cp "$WEB_DIR/demo/googleb0d58790792acd24.html" "$OUTPUT_DIR/googleb0d58790792acd24.html"
cp "$WEB_DIR/demo/sitemap.xml" "$OUTPUT_DIR/sitemap.xml"
cp -R "$WEB_DIR/demo/images" "$OUTPUT_DIR/images"
cp -R "$WEB_DIR/dist" "$OUTPUT_DIR/dist"
cp -R "$WEB_DIR/assets" "$OUTPUT_DIR/assets"

PACKAGE_VERSION="$(node -p "require('$WEB_DIR/package.json').version")"
cp "$WEB_DIR/dist/index.js" "$OUTPUT_DIR/downloads/digital-pet-v${PACKAGE_VERSION}.js"
cp "$WEB_DIR/dist/index.js" "$OUTPUT_DIR/downloads/digital-pet.js"
sed -i.bak '/sourceMappingURL=index.js.map/d' "$OUTPUT_DIR/downloads/digital-pet-v${PACKAGE_VERSION}.js"
sed -i.bak '/sourceMappingURL=index.js.map/d' "$OUTPUT_DIR/downloads/digital-pet.js"
rm "$OUTPUT_DIR/downloads/"*.bak

cd "$WEB_DIR"
PACKAGE_NAME="$(node -p "require('$WEB_DIR/package.json').name")"
CLEAN_NAME="${PACKAGE_NAME//@/}"
CLEAN_NAME="${CLEAN_NAME//\//-}"
npm pack --pack-destination "$OUTPUT_DIR/downloads"
mv "$OUTPUT_DIR/downloads/${CLEAN_NAME}-${PACKAGE_VERSION}.tgz" \
  "$OUTPUT_DIR/downloads/digital-pet-${PACKAGE_VERSION}.tgz"

sed -i.bak 's#\.\./dist/index\.js#./dist/index.js#g' "$OUTPUT_DIR/index.html"
rm "$OUTPUT_DIR/index.html.bak"
touch "$OUTPUT_DIR/.nojekyll"

echo "Created GitHub Pages artifact at $OUTPUT_DIR"
