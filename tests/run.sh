#!/bin/bash
set -euo pipefail

tmp_dir=$(mktemp -d)
files=()

# Run with existing /home
base="$tmp_dir/with_home"
BASE_DIR="$base" ./generate-audit-json.sh >/tmp/test_audit.log
archive_dir="$base/archives"
file=$(ls "$archive_dir"/audit_*.json | head -n 1)
if [ ! -f "$file" ]; then
  echo "No audit file generated with /home present" >&2
  exit 1
fi
files+=("$file")

# Run without /home
backup_dir=$(mktemp -d)
if [ -d /home ]; then
  mv /home "$backup_dir/home"
fi
base="$tmp_dir/without_home"
BASE_DIR="$base" ./generate-audit-json.sh >/tmp/test_audit.log
archive_dir="$base/archives"
file=$(ls "$archive_dir"/audit_*.json | head -n 1)
if [ ! -f "$file" ]; then
  echo "No audit file generated without /home" >&2
  mv "$backup_dir/home" /home 2>/dev/null || true
  exit 1
fi
files+=("$file")
if [ -d "$backup_dir/home" ]; then
  mv "$backup_dir/home" /home
fi
rmdir "$backup_dir"

# Validate disk entries for both scenarios
jq -e '.disks | length > 1' "${files[0]}" >/dev/null
jq -e '.disks[1] != null' "${files[0]}" >/dev/null
jq -e '.disks[1] == null' "${files[1]}" >/dev/null

# Generic checks
for file in "${files[@]}"; do
  jq empty "$file"
  jq -e '.cpu.model | length > 0' "$file" >/dev/null
  jq -e '.cpu.cores | tonumber > 0' "$file" >/dev/null
  jq -e '.ports | type == "array"' "$file" >/dev/null
  jq -e '.docker.containers | type == "array"' "$file" >/dev/null
done

echo "Test passed: audit JSON reports generated and validated at ${files[*]}"
