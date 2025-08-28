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

# Positive validation
./tests/validate_report.sh "$file"

# Positive: validation should allow optional null disk entry
null_disk=$(mktemp)
jq '.disks[1] = null' "$file" > "$null_disk"
./tests/validate_report.sh "$null_disk"

# Negative: missing field
missing=$(mktemp)
jq 'del(.hostname)' "$file" > "$missing"
if ./tests/validate_report.sh "$missing" 2>/dev/null; then
  echo "Validation should fail for report missing required fields" >&2
  exit 1
fi

# Negative: wrong type
wrong_type=$(mktemp)
jq '.cpu.cores = "four"' "$file" > "$wrong_type"
if ./tests/validate_report.sh "$wrong_type" 2>/dev/null; then
  echo "Validation should fail for wrong field types" >&2
  exit 1
fi

# Negative: invalid docker container entry
bad_container=$(mktemp)
jq '.docker.containers = [{}]' "$file" > "$bad_container"
if ./tests/validate_report.sh "$bad_container" 2>/dev/null; then
  echo "Validation should fail for malformed docker container" >&2
  exit 1
fi

rm -rf "$tmp_dir" "$missing" "$wrong_type" "$bad_container" "$null_disk"

echo "Test passed: audit JSON report generated and validated at $file"
