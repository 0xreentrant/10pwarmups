#!/bin/bash

# Diagram Generator Script
# Renders Graphviz DOT files to various formats and opens them in a GUI viewer

set -e

# ─── CONFIGURATION ────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

DEFAULT_FORMAT="png"
DEFAULT_VIEWER="xdg-open"

# ─── USAGE ────────────────────────────────────────────────────────────────

usage() {
  cat << EOF
Usage: $(basename "$0") <dot-file> [format] [viewer]

Arguments:
  <dot-file>   Path to your .dot file (required)
  [format]     Output format: png (default), svg, pdf, or "all"
  [viewer]     Viewer: xdg-open (default), eog, feh, display

Examples:
  $(basename "$0") architecture.dot
  $(basename "$0") architecture.dot svg
  $(basename "$0") mydiagram.dot all eog

EOF
  exit 1
}

# ─── ARGUMENT PARSING ─────────────────────────────────────────────────────

if [[ $# -lt 1 ]]; then
  usage
fi

DOT_FILE="$1"
FORMAT="${2:-$DEFAULT_FORMAT}"
VIEWER="${3:-$DEFAULT_VIEWER}"

# ─── VALIDATION ───────────────────────────────────────────────────────────

if [[ ! -f "$DOT_FILE" ]]; then
  echo "❌ Error: File not found: $DOT_FILE"
  exit 1
fi

if ! command -v dot &> /dev/null; then
  echo "❌ Error: 'dot' command not found. Install Graphviz first."
  exit 1
fi

# Determine output base name
OUTPUT_BASE="${DOT_FILE%.*}"
OUTPUT_DIR="$(dirname "$DOT_FILE")"

# ─── RENDERING ────────────────────────────────────────────────────────────

echo "🎨 Rendering diagram from: $DOT_FILE"

render_format() {
  local fmt="$1"
  local output="${OUTPUT_BASE}.${fmt}"
  
  if dot -T"$fmt" "$DOT_FILE" -o "$output" 2>/dev/null; then
    echo "✅ Generated: $output ($(du -h "$output" | cut -f1))"
    echo "$output"
  else
    echo "❌ Failed to render as $fmt"
    return 1
  fi
}

# ─── MAIN LOGIC ───────────────────────────────────────────────────────────

RENDERED_FILE=""

if [[ "$FORMAT" == "all" ]]; then
  echo ""
  echo "🔄 Rendering all formats..."
  RENDERED_FILE=$(render_format "png")
  render_format "svg" || true
  render_format "pdf" || true
elif [[ "$FORMAT" =~ ^(png|svg|pdf)$ ]]; then
  RENDERED_FILE=$(render_format "$FORMAT")
else
  echo "❌ Unknown format: $FORMAT"
  echo "Supported: png, svg, pdf, all"
  exit 1
fi

if [[ -z "$RENDERED_FILE" ]]; then
  echo "❌ Rendering failed"
  exit 1
fi

# ─── OPEN WITH VIEWER ─────────────────────────────────────────────────────

echo ""
echo "🖼️  Opening with viewer: $VIEWER"

if ! command -v "$VIEWER" &> /dev/null; then
  echo "⚠️  Viewer '$VIEWER' not found. Trying alternatives..."
  if command -v xdg-open &> /dev/null; then
    VIEWER="xdg-open"
    echo "   Using: $VIEWER"
  elif command -v open &> /dev/null; then
    VIEWER="open"
    echo "   Using: $VIEWER"
  else
    echo "❌ No viewer found. File ready at: $RENDERED_FILE"
    exit 1
  fi
fi

if "$VIEWER" "$RENDERED_FILE" 2>/dev/null; then
  echo "✅ Opened successfully!"
else
  echo "⚠️  Could not open automatically, but file is ready:"
  echo "   $RENDERED_FILE"
fi

echo ""
echo "📍 Output directory: $OUTPUT_DIR"
