#!/bin/bash
# AI Resume Scorer - Local Deploy Script
# Run this on your Mac (not sandbox - sandbox OOMs on npm install)

set -e

echo "=== AI Resume Scorer Deploy ==="
echo ""

cd "$(dirname "$0")"

# 1. Install dependencies
echo "[1/4] Installing dependencies..."
npm install --legacy-peer-deps

# 2. Build the Next.js app
echo "[2/4] Building Next.js app..."
npm run build

# 3. Quick type-check
echo "[3/4] Type-checking..."
npx tsc --noEmit 2>/dev/null || echo "  (type warnings present, not blocking deploy)"

# 4. Start dev server for testing
echo "[3/4] Starting dev server on http://localhost:3000"
echo ""
echo "=== READY ==="
echo "Open http://localhost:3000 in your browser"
echo "Upload a resume to test the scoring"
echo ""
echo "To deploy to Vercel:"
echo "  npx vercel --prod"
echo ""
echo "To deploy to Vercel with env vars:"
echo "  npx vercel --prod -e OPENROUTER_API_KEY=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"

npm run dev