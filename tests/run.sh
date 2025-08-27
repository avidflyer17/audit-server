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
moved_home=false
if [ -d /home ] && mv /home "$backup_dir/home" 2>/dev/null; then
  moved_home=true
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
  mv "$backup_dir/home" /home
else
  echo "Skipping /home removal test: cannot move /home" >&2
fi
rmdir "$backup_dir"

# Validate disk entries for both scenarios
jq -e '.disks | length > 1' "${files[0]}" >/dev/null
jq -e '.disks[1] != null' "${files[0]}" >/dev/null
if [ "$moved_home" = true ]; then
  jq -e '.disks[1] == null' "${files[1]}" >/dev/null
fi

# Generic checks
for file in "${files[@]}"; do
  jq empty "$file"
  jq -e '.cpu.model | length > 0' "$file" >/dev/null
  jq -e '.cpu.cores | tonumber > 0' "$file" >/dev/null
  jq -e '.ports | type == "array"' "$file" >/dev/null
  jq -e '.docker.containers | type == "array"' "$file" >/dev/null
done

# Ensure the ports table no longer exposes copy/paste actions
if rg -q '<th>Actions</th>' audits/index.html; then
  echo "Actions column still present in ports table" >&2
  exit 1
fi
if rg -q 'Copier résumé et mitigation' audits/scripts/viewer.js; then
  echo "Copy helper still present in scripts" >&2
  exit 1
fi

echo "Test passed: audit JSON reports generated and validated at ${files[*]}"
