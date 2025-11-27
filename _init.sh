#!/bin/bash
# Chravel Environment Health Check
# Run at start of each session to validate environment

echo "🔍 Chravel Environment Health Check"
echo "===================================="

# Check Node version
echo -n "Node version: "
node --version

# Check npm version  
echo -n "npm version: "
npm --version

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo "✅ node_modules exists"
else
  echo "❌ node_modules missing - run: npm install"
  exit 1
fi

# Check if .env exists
if [ -f ".env" ]; then
  echo "✅ .env file exists"
else
  echo "⚠️  .env file missing - demo mode only"
fi

# Run TypeScript check
echo ""
echo "📝 Running TypeScript check..."
npm run typecheck
if [ $? -eq 0 ]; then
  echo "✅ TypeScript: PASS"
else
  echo "❌ TypeScript: FAIL"
  exit 1
fi

# Run linter
echo ""
echo "🧹 Running ESLint..."
npm run lint
if [ $? -eq 0 ]; then
  echo "✅ Lint: PASS"
else
  echo "⚠️  Lint: WARNINGS (review but can proceed)"
fi

# Check git status
echo ""
echo "📊 Git Status:"
git status --short
echo ""
git log --oneline -5

echo ""
echo "===================================="
echo "✅ Environment Ready"
echo "📖 Next: Read claude-progress.txt"
echo "===================================="
