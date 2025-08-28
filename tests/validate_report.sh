#!/bin/bash
set -euo pipefail

file="$1"

# Ensure the JSON is valid
jq empty "$file"

# Required top-level keys and types
jq -e '.generated | type == "string" and length > 0' "$file" >/dev/null
jq -e '.hostname | type == "string" and length > 0' "$file" >/dev/null
jq -e '.ip_local | type == "string" and length > 0' "$file" >/dev/null
jq -e '.ip_pub | type == "string" and length > 0' "$file" >/dev/null
jq -e '.uptime | type == "string" and length > 0' "$file" >/dev/null
jq -e '.load_average | type == "string" and length > 0' "$file" >/dev/null

# Memory structure
jq -e '.memory.ram | (.total|type=="string") and (.used|type=="string") and (.free|type=="string") and (.shared|type=="string") and (.buff_cache|type=="string") and (.available|type=="string")' "$file" >/dev/null
jq -e '.memory.swap | (.total|type=="string") and (.used|type=="string") and (.free|type=="string")' "$file" >/dev/null

# Disks array
jq -e '.disks | type == "array" and length == 2' "$file" >/dev/null
jq -e 'all(.disks[]; (.filesystem|type=="string") and (.size|type=="string") and (.used|type=="string") and (.available|type=="string") and (.used_percent|type=="string") and (.mountpoint|type=="string"))' "$file" >/dev/null

# CPU object
jq -e '.cpu.model | type=="string" and length > 0' "$file" >/dev/null
jq -e '.cpu.cores | type=="number" and . > 0' "$file" >/dev/null
jq -e '.cpu.usage | type=="array" and all(.[]; (.core|tostring|length > 0) and (.usage|type=="number"))' "$file" >/dev/null
jq -e '.cpu.temperatures | type=="array" and all(.[]; (.core|tostring|length > 0) and (.temp|type=="number"))' "$file" >/dev/null

jq -e '.cpu_load_color | type=="string" and length > 0' "$file" >/dev/null

# Services array
jq -e '.services | type=="array" and all(.[]; type=="string" and length > 0)' "$file" >/dev/null

# Top CPU and memory processes
jq -e '.top_cpu | type=="array" and all(.[]; (.pid|tostring|length>0) and (.cmd|type=="string") and (.cpu|tostring|length>0) and (.mem|tostring|length>0))' "$file" >/dev/null
jq -e '.top_mem | type=="array" and all(.[]; (.pid|tostring|length>0) and (.cmd|type=="string") and (.mem|tostring|length>0) and (.cpu|tostring|length>0))' "$file" >/dev/null

# Docker containers
jq -e '.docker.containers | type=="array" and all(.[]; (.name|type=="string") and (.state|type=="string") and (.health|type=="string") and (.uptime|type=="string") and (.has_stats|type=="boolean") and ((.has_stats==false) or ((.cpu_pct|type=="number") and (.mem_pct|type=="number") and (.mem_used_bytes|type=="number") and (.mem_limit_bytes|type=="number"))))' "$file" >/dev/null
