#!/bin/bash
set -euo pipefail

# ✅ Commandes requises
# Docker est optionnel : s'il n'est pas présent, la collecte des conteneurs sera ignorée.
REQUIRED_CMDS=(mpstat sensors jq bc awk sed grep)
for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Commande requise manquante : $cmd" >&2
    exit 1
  fi
done

# 🛠 Script de génération de rapport d'audit système
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# 📅 Timestamp
TIMESTAMP=$(date "+%Y-%m-%d_%H-%M")
HUMAN_DATE=$(date "+%d/%m/%Y à %H:%M")

# 📁 Dossiers (modifiable avec la variable d'environnement BASE_DIR)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="${BASE_DIR:-"$SCRIPT_DIR/audits"}"
ARCHIVE_DIR="$BASE_DIR/archives"
OUTPUT_FILE="${ARCHIVE_DIR}/audit_${TIMESTAMP}.json"
mkdir -p "$ARCHIVE_DIR"

# 🔍 Infos système
UPTIME=$(uptime -p)
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | sed 's/ //g')
HOSTNAME=$(hostname)

# 🌐 Réseau
IP_LOCAL=$(hostname -I | awk '{print $1}')
# IP publique avec délai max 5s ; N/A si la requête échoue
IP_PUBLIQUE=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "N/A")

# 💽 Disques
DISK_ROOT=$(df -h / | awk 'NR==2 {print "{\"filesystem\":\""$1"\",\"size\":\""$2"\",\"used\":\""$3"\",\"available\":\""$4"\",\"used_percent\":\""$5"\",\"mountpoint\":\""$6"\"}"}')
if [ -d /home ]; then
  DISK_HOME=$(df -h /home | awk 'NR==2 {print "{\"filesystem\":\""$1"\",\"size\":\""$2"\",\"used\":\""$3"\",\"available\":\""$4"\",\"used_percent\":\""$5"\",\"mountpoint\":\""$6"\"}"}')
else
  DISK_HOME=null
fi

# 🔧 Processus gourmands
TOP_CPU=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 6 | jq -Rn '[inputs | split(" ") | map(select(length > 0)) | select(length >= 4) | {"pid": .[0], "cmd": .[1], "cpu": .[2], "mem": .[3]}]')
TOP_MEM=$(ps -eo pid,comm,%mem,%cpu --sort=-%mem | head -n 6 | jq -Rn '[inputs | split(" ") | map(select(length > 0)) | select(length >= 4) | {"pid": .[0], "cmd": .[1], "mem": .[2], "cpu": .[3]}]')

# 📦 Conversion d'unités en octets
to_bytes() {
  local input="$1"
  local num unit factor
  num=$(echo "$input" | tr ',' '.' | sed -E 's/([0-9\.]+).*/\1/')
  unit=$(echo "$input" | tr ',' '.' | sed -E 's/[0-9\.]+(.*)/\1/')
  case "$unit" in
    B)   factor=1 ;;
    KB)  factor=1000 ;;
    MB)  factor=1000000 ;;
    GB)  factor=1000000000 ;;
    KiB) factor=1024 ;;
    MiB) factor=$((1024*1024)) ;;
    GiB) factor=$((1024*1024*1024)) ;;
    *)   factor=1 ;;
  esac
  awk -v n="$num" -v f="$factor" 'BEGIN{printf "%.0f", n*f}'
}

# 🧠 Collecte des statistiques mémoire et swap
collect_memory() {
  local free_output mem_total mem_used mem_free mem_shared mem_buff_cache mem_available
  local swap_total swap_used swap_free
  free_output=$(free -h)
  read -r mem_total mem_used mem_free mem_shared mem_buff_cache mem_available <<< "$(echo "$free_output" | awk 'NR==2 {print $2, $3, $4, $5, $6, $7}')"
  read -r swap_total swap_used swap_free <<< "$(echo "$free_output" | awk 'NR==3 {print $2, $3, $4}')"
  jq -n \
    --arg total "$mem_total" \
    --arg used "$mem_used" \
    --arg free "$mem_free" \
    --arg shared "$mem_shared" \
    --arg buff_cache "$mem_buff_cache" \
    --arg available "$mem_available" \
    --arg swap_total "$swap_total" \
    --arg swap_used "$swap_used" \
    --arg swap_free "$swap_free" \
    '{ram:{total:$total,used:$used,free:$free,shared:$shared,buff_cache:$buff_cache,available:$available},swap:{total:$swap_total,used:$swap_used,free:$swap_free}}'
}

# 🧮 Collecte des statistiques CPU
collect_cpu() {
  local model cores usage_json temp_json total_usage color
  model=$(lscpu | grep "Model name" | sed 's/.*: //')
  cores=$(nproc)
  usage_json=$(mpstat -P ALL 1 1 | awk '/Average/ && $2 ~ /[0-9]/ {usage=100-$12; printf "%s %.1f\n", $2, usage}' | jq -Rn '[inputs | split(" ") | {core:.[0], usage:(.[1]|tonumber)}]')
  temp_json=$({ sensors 2>/dev/null || true; } | grep -E '^[[:space:]]*Core [0-9]+' | sed 's/+//g; s/°C//g' | awk '{core=$2; temp=$3; gsub(":","",core); print core,temp}' | jq -Rn '[inputs | split(" ") | {core:(.[0]|tonumber), temp:(.[1]|tonumber)}]')
  [ -z "$temp_json" ] && temp_json="[]"
  total_usage=$(echo "$usage_json" | jq '[.[]|.usage]|add/length')
  color="green"
  if (( $(echo "$total_usage > 60" | bc -l) )); then color="orange"; fi
  if (( $(echo "$total_usage > 85" | bc -l) )); then color="red"; fi
  jq -n --arg model "$model" --argjson cores "$cores" --argjson usage "$usage_json" --argjson temps "$temp_json" --arg color "$color" '{model:$model,cores:$cores,usage:$usage,temperatures:$temps,color:$color}'
}

# 🛠 Collecte des services actifs
collect_services() {
  local services
  services=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | awk '{print $1}' | jq -R . | jq -s .) || services="[]"
  echo "${services:-[]}"
}

# 🐳 Docker (stats containers)
DOCKER_CONTAINERS="[]"
if command -v docker >/dev/null 2>&1 && timeout 5 docker info >/dev/null 2>&1; then
  declare -A CPU MEM_PCT MEM_USED MEM_LIMIT
  while IFS= read -r line; do
    name=$(echo "$line" | sed -n 's/.*"Name":"\([^\"]*\)".*/\1/p')
    cpu=$(echo "$line" | sed -n 's/.*"CPUPerc":"\([^\"]*\)".*/\1/p' | tr -d '% ')
    memp=$(echo "$line" | sed -n 's/.*"MemPerc":"\([^\"]*\)".*/\1/p' | tr -d '% ')
    usage=$(echo "$line" | sed -n 's/.*"MemUsage":"\([^\"]*\)".*/\1/p')
    used=$(echo "$usage" | awk -F'/' '{gsub(/^[ \t]+|[ \t]+$/, "", $1); print $1}')
    limit=$(echo "$usage" | awk -F'/' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
    used_bytes=$(to_bytes "$used")
    limit_bytes=$(to_bytes "$limit")
    CPU["$name"]="$cpu"
    MEM_PCT["$name"]="$memp"
    MEM_USED["$name"]="$used_bytes"
    MEM_LIMIT["$name"]="$limit_bytes"
  done < <(timeout 5 docker stats --no-stream --no-trunc --format '{{json .}}' 2>/dev/null || true)

  DOCKER_PS_OUTPUT=$(docker ps -a --format '{{json .}}' 2>/dev/null || true)
  if [[ -n "$DOCKER_PS_OUTPUT" ]]; then
    while IFS= read -r line; do
      name=$(echo "$line" | sed -n 's/.*"Names":"\([^\"]*\)".*/\1/p')
      status=$(echo "$line" | sed -n 's/.*"Status":"\([^\"]*\)".*/\1/p')
      running_for=$(echo "$line" | sed -n 's/.*"RunningFor":"\([^\"]*\)".*/\1/p')
      state=$(echo "$status" | awk '{print tolower($1)}')
      [[ "$state" == "up" ]] && state="running"
      health=$(echo "$status" | sed -n 's/.*(\([^)]*\)).*/\1/p')

      if [[ -n "${CPU[$name]+x}" ]]; then
        DOCKER_CONTAINERS=$(echo "$DOCKER_CONTAINERS" | jq --arg name "$name" --arg state "$state" --arg uptime "$running_for" --arg health "$health" --arg cpu "${CPU[$name]}" --arg mempct "${MEM_PCT[$name]}" --arg memused "${MEM_USED[$name]}" --arg memlimit "${MEM_LIMIT[$name]}" '. + [{name:$name,state:$state,health:(if $health=="" then null else $health end),uptime:$uptime,has_stats:true,cpu_pct:($cpu|tonumber),mem_pct:($mempct|tonumber),mem_used_bytes:($memused|tonumber),mem_limit_bytes:($memlimit|tonumber)}]')
      else
        DOCKER_CONTAINERS=$(echo "$DOCKER_CONTAINERS" | jq --arg name "$name" --arg state "$state" --arg uptime "$running_for" --arg health "$health" '. + [{name:$name,state:$state,health:(if $health=="" then null else $health end),uptime:$uptime,has_stats:false,cpu_pct:null,mem_pct:null,mem_used_bytes:null,mem_limit_bytes:null}]')
      fi
    done <<< "$DOCKER_PS_OUTPUT"
  fi
fi

# Collecte des métriques
CPU_DATA=$(collect_cpu)
CPU_COLOR=$(echo "$CPU_DATA" | jq -r '.color')
CPU_JSON=$(echo "$CPU_DATA" | jq 'del(.color)')
MEMORY_JSON=$(collect_memory)
SERVICES_JSON=$(collect_services)

# 🔧 Processus gourmands (déjà calculés plus haut)

# 🔧 Création JSON
jq -n \
  --arg generated "$HUMAN_DATE" \
  --arg uptime "$UPTIME" \
  --arg load_avg "$LOAD_AVG" \
  --arg hostname "$HOSTNAME" \
  --arg ip_local "$IP_LOCAL" \
  --arg ip_pub "$IP_PUBLIQUE" \
  --argjson memory "$MEMORY_JSON" \
  --argjson disk_root "$DISK_ROOT" \
  --argjson disk_home "$DISK_HOME" \
  --argjson cpu "$CPU_JSON" \
  --arg cpu_color "$CPU_COLOR" \
  --argjson services "$SERVICES_JSON" \
  --argjson top_cpu "$TOP_CPU" \
  --argjson top_mem "$TOP_MEM" \
  --argjson docker_containers "$DOCKER_CONTAINERS" \
  '{
    generated: $generated,
    hostname: $hostname,
    ip_local: $ip_local,
    ip_pub: $ip_pub,
    uptime: $uptime,
    load_average: $load_avg,
    memory: $memory,
    disks: [$disk_root, $disk_home],
    cpu: $cpu,
    cpu_load_color: $cpu_color,
    services: $services,
    top_cpu: $top_cpu,
    top_mem: $top_mem,
    docker: { containers: $docker_containers }
  }' > "$OUTPUT_FILE"

# 🧹 Nettoyage des anciens fichiers
find "$ARCHIVE_DIR" -type f -name "audit_*.json" | sort | head -n -21 | xargs -r rm

# 🔄 Mise à jour index.json
find "$ARCHIVE_DIR" -maxdepth 1 -name "audit_*.json" -printf "%f\n" | sort -r | jq -R . | jq -s . > "$ARCHIVE_DIR/index.json"

echo "✅ Rapport enrichi généré : $OUTPUT_FILE"
