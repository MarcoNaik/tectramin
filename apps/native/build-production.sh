#!/bin/bash
set -e

TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
OUTPUT_DIR="$(pwd)"
TEMP_DIR=""

cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        echo "Build folder: $TEMP_DIR"
    fi
}
trap cleanup EXIT

echo "Building production AAB with mapping files..."

rm -f "$OUTPUT_DIR"/*.aab "$OUTPUT_DIR"/mapping-*.txt 2>/dev/null || true

export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export JAVA_HOME=$(/usr/libexec/java_home -v17)

TEMP_DIR=$(mktemp -d)
echo "Temp staging dir: $TEMP_DIR"

npx eas build --platform android --local --profile production-local --output "$TEMP_DIR/app.aab" --non-interactive 2>&1 | tee "$TEMP_DIR/build.log" &
BUILD_PID=$!

while kill -0 $BUILD_PID 2>/dev/null; do
    BUILD_DIR=$(find /var/folders -type d -name "eas-build-local-nodejs" 2>/dev/null | head -1)
    if [ -n "$BUILD_DIR" ]; then
        MAPPING_FILE=$(find "$BUILD_DIR" -path "*/outputs/mapping/release/mapping.txt" 2>/dev/null | head -1)
        if [ -n "$MAPPING_FILE" ] && [ -f "$MAPPING_FILE" ]; then
            cp "$MAPPING_FILE" "$TEMP_DIR/mapping.txt" 2>/dev/null || true
        fi
    fi
    sleep 5
done

wait $BUILD_PID
BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ] && [ -f "$TEMP_DIR/app.aab" ]; then
    mv "$TEMP_DIR/app.aab" "$OUTPUT_DIR/tectramin-${TIMESTAMP}.aab"
    echo "AAB saved: $OUTPUT_DIR/tectramin-${TIMESTAMP}.aab"

    if [ -f "$TEMP_DIR/mapping.txt" ]; then
        mv "$TEMP_DIR/mapping.txt" "$OUTPUT_DIR/mapping-${TIMESTAMP}.txt"
        echo "Mapping saved: $OUTPUT_DIR/mapping-${TIMESTAMP}.txt"
    else
        echo "Warning: mapping.txt not found"
    fi

    echo ""
    echo "Build complete!"
    echo "Upload both files to Play Console:"
    echo "  - AAB: tectramin-${TIMESTAMP}.aab"
    echo "  - Mapping: mapping-${TIMESTAMP}.txt"
else
    echo "Build failed with exit code: $BUILD_RESULT"
    exit 1
fi

rm -rf "$TEMP_DIR"
