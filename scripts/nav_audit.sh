#!/usr/bin/env bash
set -euo pipefail

# Generate a CSV report of chapter pages across all books with:
# repo,path,http_status,page_nav
# Requires: gh, curl, ripgrep (rg), awk, sed

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT_DIR/reports/nav_audit.csv"
TMP_HTML="/tmp/nav_audit_page.html"

echo "repo,path,http_status,page_nav" > "$OUT"

# Collect book repos from README
ALL=$(grep -o "https://github.com/itdojp/[a-zA-Z0-9._/-]*" -h "$ROOT_DIR/README.md" | sort -u)

for url in $ALL; do
  repo=${url##*/}
  base=$(gh api repos/itdojp/$repo/pages --jq '.html_url' 2>/dev/null || echo "https://itdojp.github.io/$repo/")
  nav="$ROOT_DIR/$repo/docs/_data/navigation.yml"
  if [[ ! -f "$nav" ]]; then
    echo "[nav_audit] skip (no navigation.yml): $repo" >&2
    continue
  fi
  mapfile -t paths < <(awk '/path:/{print $2}' "$nav" | sed 's/"//g')
  for p in "${paths[@]}"; do
    [[ -n "$p" ]] || continue
    full="${base%/}${p}"
    code=$(curl -s -H 'Cache-Control: no-cache' -o "$TMP_HTML" -w "%{http_code}" "$full" || true)
    hasnav=0; rg -q 'class="page-nav"' "$TMP_HTML" && hasnav=1 || true
    echo "$repo,$p,$code,$hasnav" >> "$OUT"
  done
done

echo "[nav_audit] wrote $OUT"

