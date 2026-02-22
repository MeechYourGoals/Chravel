#!/bin/bash
# =============================================================================
# Chravel MCP Setup Script
# Sets up Model Context Protocol (MCP) servers for Claude Code
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_FILE="$PROJECT_ROOT/.mcp.json"
MCP_EXAMPLE="$PROJECT_ROOT/.mcp.json.example"

echo "🔧 Chravel MCP Setup"
echo "===================="

# Check if .mcp.json already exists
if [ -f "$MCP_FILE" ]; then
  echo "✅ .mcp.json already exists at $MCP_FILE"
  echo "   To reconfigure, delete it and run this script again."
  exit 0
fi

# Copy from example
if [ ! -f "$MCP_EXAMPLE" ]; then
  echo "❌ .mcp.json.example not found. Is your repo up to date?"
  exit 1
fi

cp "$MCP_EXAMPLE" "$MCP_FILE"
echo "📋 Created .mcp.json from example"

# Prompt for Supabase Personal Access Token
echo ""
echo "To connect Claude Code to your Supabase project, you need a Personal Access Token."
echo "Get one at: https://app.supabase.com/account/tokens"
echo ""
read -r -p "Enter your Supabase Personal Access Token: " SUPABASE_TOKEN

if [ -z "$SUPABASE_TOKEN" ]; then
  echo "⚠️  No token provided. Edit $MCP_FILE manually to add your token."
  exit 0
fi

# Replace placeholder in .mcp.json
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|<YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN>|$SUPABASE_TOKEN|g" "$MCP_FILE"
else
  # Linux
  sed -i "s|<YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN>|$SUPABASE_TOKEN|g" "$MCP_FILE"
fi

echo "✅ Supabase MCP configured successfully!"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code to pick up the new MCP configuration"
echo "  2. The Supabase MCP server will be available as 'supabase' in Claude Code"
echo ""
echo "⚠️  Note: .mcp.json is gitignored — your token stays local, never committed."
