#!/bin/bash
# Package plugin for Obsidian community plugin distribution
# This creates a zip file with all necessary files including tutorials

set -e

VERSION=$(node -p "require('./manifest.json').version")
PLUGIN_NAME="ideatr"
RELEASE_DIR="release"
ZIP_NAME="${PLUGIN_NAME}-${VERSION}.zip"

echo "Packaging ${PLUGIN_NAME} v${VERSION} for release..."

# Clean previous release
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# Build the plugin
echo "Building plugin..."
npm run build

# Copy required files
echo "Copying files..."
cp main.js "${RELEASE_DIR}/"
cp manifest.json "${RELEASE_DIR}/"
cp styles.css "${RELEASE_DIR}/"

# Copy tutorials folder if it exists
if [ -d "tutorials" ]; then
    echo "Copying tutorials..."
    cp -r tutorials "${RELEASE_DIR}/"
fi

# Copy binaries folder if it exists
if [ -d "binaries" ]; then
    echo "Copying binaries..."
    cp -r binaries "${RELEASE_DIR}/"
fi

# Create zip file
echo "Creating zip file..."
cd "${RELEASE_DIR}"
zip -r "../${ZIP_NAME}" .
cd ..

echo "✓ Release package created: ${ZIP_NAME}"
echo "  Files included:"
echo "    - main.js"
echo "    - manifest.json"
echo "    - styles.css"
[ -d "tutorials" ] && echo "    - tutorials/ (${ZIP_NAME} includes all tutorial files)"
[ -d "binaries" ] && echo "    - binaries/ (platform-specific binaries)"

