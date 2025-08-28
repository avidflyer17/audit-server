#!/bin/bash
set -euo pipefail

tmp_dir=$(mktemp -d)
base="$tmp_dir/audit"
BASE_DIR="$base" ./generate-audit-json.sh >/tmp/test_audit.log
archive_dir="$base/archives"
file=$(ls "$archive_dir"/audit_*.json | head -n 1)
if [ ! -f "$file" ]; then
  echo "No audit file generated" >&2
  exit 1
fi

# Validate disk entries
jq -e '.disks | length == 2' "$file" >/dev/null
jq -e '.disks[0] != null' "$file" >/dev/null

# Generic checks
jq empty "$file"
jq -e '.cpu.model | length > 0' "$file" >/dev/null
jq -e '.cpu.cores | tonumber > 0' "$file" >/dev/null
jq -e '.docker.containers | type == "array"' "$file" >/dev/null
jq -e 'has("ports") | not' "$file" >/dev/null

rm -rf "$tmp_dir"

echo "Test passed: audit JSON report generated and validated at $file"
