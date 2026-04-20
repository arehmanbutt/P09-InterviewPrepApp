#!/usr/bin/env bash
# Install language runtimes into the running Piston container.
# Run this once after: docker compose up -d
#
# Usage:
#   ./install-runtimes.sh              # uses localhost:2000
#   ./install-runtimes.sh http://my-vps:2000

set -euo pipefail

PISTON="${1:-http://localhost:2000}"
API="$PISTON/api/v2/packages"

echo "Installing Piston runtimes from $PISTON ..."

install_runtime() {
  local lang="$1"
  local ver="$2"
  echo -n "  Installing $lang $ver ... "
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{\"language\":\"$lang\",\"version\":\"$ver\"}")
  if [[ "$http_code" == "200" ]]; then
    echo "OK"
  else
    echo "FAILED (HTTP $http_code)"
    exit 1
  fi
}

# Fetch available versions and pick the latest for each language
get_latest() {
  local lang="$1"
  curl -s "$PISTON/api/v2/packages" | \
    python3 -c "
import sys, json
pkgs = json.load(sys.stdin)
matches = [p for p in pkgs if p['language'] == '$lang' and not p['installed']]
if not matches:
    installed = [p for p in pkgs if p['language'] == '$lang' and p.get('installed')]
    if installed:
        print(installed[-1]['language_version'])
    else:
        print('')
    exit(0)
latest = sorted(matches, key=lambda p: p['language_version'])[-1]
print(latest['language_version'])
"
}

echo ""
echo "Fetching available packages..."

for lang in javascript python gcc; do
  ver=$(get_latest "$lang")
  if [[ -z "$ver" ]]; then
    echo "  Skipping $lang — not available or already installed"
  else
    install_runtime "$lang" "$ver"
  fi
done

echo ""
echo "Installed runtimes:"
curl -s "$PISTON/api/v2/runtimes" | python3 -c "
import sys, json
rts = json.load(sys.stdin)
for r in rts:
    print(f\"  {r['language']} {r['version']}\")
"

echo ""
echo "Done. Set PISTON_API_URL=$PISTON in your app's environment."
