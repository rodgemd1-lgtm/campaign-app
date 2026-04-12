#!/bin/bash
# ═══════════════════════════════════════════════════
# CAMPAIGN APP — Vercel Deployment Setup
# Run this on your Mac (the sandbox can't run Node.js)
# ═══════════════════════════════════════════════════
set -e

echo "=========================================="
echo " CAMPAIGN APP — Vercel Deployment"
echo "=========================================="
echo ""
echo "Repo: https://github.com/rodgemd1-lgtm/campaign-app"
echo ""

# ─── OPTION A: Vercel Dashboard (fastest, 2 minutes) ───
echo "=== OPTION A: Dashboard Import (RECOMMENDED) ==="
echo ""
echo "1. Open: https://vercel.com/new"
echo "2. Click 'Import Git Repository'"
echo "3. Select: rodgemd1-lgtm/campaign-app"
echo "4. Framework: Next.js (auto-detected)"
echo "5. Add these Environment Variables:"
echo ""
echo "   OPENROUTER_API_KEY     = $(grep OPENROUTER_API_KEY ~/.hermes/.env | cut -d= -f2 | tr -d '"')"
echo "   STRIPE_SECRET_KEY      = $(grep STRIPE_SECRET_KEY ~/.hermes/.env | cut -d= -f2 | tr -d '"')"
echo "   NEXT_PUBLIC_APP_URL    = https://campaign-app.vercel.app"
echo "   NEXT_PUBLIC_SUPABASE_URL = https://zqsdadnnpgqhehqxplio.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxc2RhZG5ucGdxaGVocXhwbGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjU1MjUsImV4cCI6MjA4ODQwMTUyNX0.3kAISnwpOMMEj62AZcDnBMApv3SXHergqopCWIPN6Ew"
echo ""
echo "6. Click 'Deploy'"
echo "7. Wait ~60 seconds for build"
echo "8. App is live at: https://campaign-app.vercel.app"
echo ""

# ─── OPTION B: Vercel CLI ───
echo "=== OPTION B: CLI Deploy ==="
echo ""
echo "1. cd ~/Desktop/campaign-app"
echo "2. vercel login   (opens browser)"
echo "3. vercel --prod  (first deploy)"
echo "4. Add env vars in dashboard: https://vercel.com/dashboard"
echo "5. vercel --prod  (redeploy with env vars)"
echo ""

# ─── After deploy: set GitHub secrets for auto-deploy ───
echo "=== POST-DEPLOY: Set up auto-deploy ==="
echo ""
echo "After first deploy via dashboard, get these from Vercel:"
echo "  Settings → General → Project ID (VERCEL_PROJECT_ID)"
echo "  Settings → General → Org ID (VERCEL_ORG_ID)"
echo "  Account → Tokens → Create Token (VERCEL_TOKEN)"
echo ""
echo "Then add GitHub secrets:"
echo "  cd ~/Desktop/campaign-app"
echo "  gh secret set VERCEL_TOKEN"
echo "  gh secret set VERCEL_ORG_ID"
echo "  gh secret set VERCEL_PROJECT_ID"
echo ""
echo "After that, every push to main auto-deploys to Vercel."