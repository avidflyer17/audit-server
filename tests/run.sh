#!/bin/bash
set -euo pipefail

tmp_dir=$(mktemp -d)
BASE_DIR="$tmp_dir" ./generate-audit-json.sh >/tmp/test_audit.log
archive_dir="$tmp_dir/archives"
file=$(ls "$archive_dir"/audit_*.json | head -n 1)

if [ ! -f "$file" ]; then
  echo "No audit file generated" >&2
  exit 1
fi

jq empty "$file"

echo "Test passed: audit JSON generated at $file"
