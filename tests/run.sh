#!/bin/bash
set -euo pipefail

tmp_dir=$(mktemp -d)
files=()

for i in 1 2; do
  base="$tmp_dir/run$i"
  BASE_DIR="$base" ./generate-audit-json.sh >/tmp/test_audit.log
  archive_dir="$base/archives"
  file=$(ls "$archive_dir"/audit_*.json | head -n 1)
  if [ ! -f "$file" ]; then
    echo "No audit file generated for run $i" >&2
    exit 1
  fi
  files+=("$file")
done

for file in "${files[@]}"; do
  jq empty "$file"
  jq -e '.cpu.model | length > 0' "$file" >/dev/null
  jq -e '.cpu.cores | tonumber > 0' "$file" >/dev/null
  jq -e '.ports | type == "array"' "$file" >/dev/null
  jq -e '.docker.containers | type == "array"' "$file" >/dev/null
done

echo "Test passed: audit JSON reports generated and validated at ${files[*]}"
