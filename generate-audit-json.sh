#!/bin/bash

# 🛠 Script de génération de rapport d'audit système
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin


# 📅 Timestamp
TIMESTAMP=$(date "+%Y-%m-%d_%H-%M")
HUMAN_DATE=$(date "+%d/%m/%Y à %H:%M")

# 📁 Dossiers
BASE_DIR="/home/damswallace/docker/audits-nginx/audits"
ARCHIVE_DIR="$BASE_DIR/archives"
OUTPUT_FILE="${ARCHIVE_DIR}/audit_${TIMESTAMP}.json"
mkdir -p "$ARCHIVE_DIR"

# 🔍 Infos système
UPTIME=$(uptime -p)
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | sed 's/ //g')
HOSTNAME=$(hostname)

# 🌐 Réseau
IP_LOCAL=$(hostname -I | awk '{print $1}')
IP_PUBLIQUE=$(curl -s ifconfig.me || echo "N/A")

# 🧠 RAM & Swap
MEMORY=$(free -h | awk 'NR==2 {print "{\"total\":\""$2"\",\"used\":\""$3"\",\"free\":\""$4"\",\"shared\":\""$5"\",\"buff_cache\":\""$6"\",\"available\":\""$7"\"}"}')
SWAP=$(free -h | awk 'NR==3 {print "{\"total\":\""$2"\",\"used\":\""$3"\",\"free\":\""$4"\"}"}')

# 💽 Disques
DISK_ROOT=$(df -h / | awk 'NR==2 {print "{\"filesystem\":\""$1"\",\"size\":\""$2"\",\"used\":\""$3"\",\"available\":\""$4"\",\"used_percent\":\""$5"\",\"mountpoint\":\""$6"\"}"}')
DISK_HOME=$(df -h /home | awk 'NR==2 {print "{\"filesystem\":\""$1"\",\"size\":\""$2"\",\"used\":\""$3"\",\"available\":\""$4"\",\"used_percent\":\""$5"\",\"mountpoint\":\""$6"\"}"}')

# 🧮 CPU
CPU_MODEL=$(lscpu | grep "Model name" | sed 's/.*: //')
CPU_CORES=$(nproc)
CPU_USAGE_PER_CORE=$(mpstat -P ALL 1 1 | awk '/Average/ && $2 ~ /[0-9]/ {usage=100-$12; printf "{\"core\":\"%s\",\"usage\":%.1f},", $2, usage}' | sed 's/,$//')
cpu_data=$(echo "[$CPU_USAGE_PER_CORE]")

# 🌡️ Température CPU par cœur
# Certaines implémentations de `sensors` préfixent les lignes par des espaces.
# On autorise donc les espaces initiaux et on supprime les symboles avant de
# construire le JSON. Si aucun cœur n'est détecté, on retourne un tableau vide.
TEMP_CORES=$(sensors 2>/dev/null \
  | grep -E '^[[:space:]]*Core [0-9]+' \
  | sed 's/^\s*//; s/+//g; s/°C//g' \
  | awk '{core=$2; temp=$3; gsub(":","",core); printf "{\"core\":%s,\"temp\":%s}\\n",core,temp}' \
  | jq -s '.')
[ -z "$TEMP_CORES" ] && TEMP_CORES="[]"

# 🎯 Couleur charge CPU
cpu_total_usage=$(echo "$cpu_data" | jq '[.[] | .usage | tonumber] | add / length')
cpu_color="green"
if (( $(echo "$cpu_total_usage > 60" | bc -l) )); then cpu_color="orange"; fi
if (( $(echo "$cpu_total_usage > 85" | bc -l) )); then cpu_color="red"; fi

# 🛠 Services actifs
SERVICES=$(systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}' | jq -R . | jq -s .)

# 🔧 Processus gourmands
TOP_CPU=$(ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 6 | jq -Rn '[inputs | split(" ") | map(select(length > 0)) | select(length >= 4) | {"pid": .[0], "cmd": .[1], "cpu": .[2], "mem": .[3]}]')
TOP_MEM=$(ps -eo pid,comm,%mem,%cpu --sort=-%mem | head -n 6 | jq -Rn '[inputs | split(" ") | map(select(length > 0)) | select(length >= 4) | {"pid": .[0], "cmd": .[1], "mem": .[2], "cpu": .[3]}]')

# 🌐 Ports ouverts
PORTS=$(ss -tuln | awk 'NR>1 {print $1, $5}' | jq -Rn '[inputs | split(" ") | select(length == 2) | {"proto": .[0], "port": .[1]}]')

# 🐳 Docker
if command -v docker >/dev/null 2>&1; then
  DOCKER_SERVICES=$(docker ps --format '{{.Names}} ({{.Status}})' | jq -R . | jq -s .)
else
  DOCKER_SERVICES="[]"
fi

# 🔧 Création JSON
jq -n \
  --arg generated "$HUMAN_DATE" \
  --arg uptime "$UPTIME" \
  --arg load_avg "$LOAD_AVG" \
  --arg hostname "$HOSTNAME" \
  --arg ip_local "$IP_LOCAL" \
  --arg ip_pub "$IP_PUBLIQUE" \
  --argjson temp_cores "$TEMP_CORES" \
  --argjson memory "$MEMORY" \
  --argjson swap "$SWAP" \
  --argjson disk_root "$DISK_ROOT" \
  --argjson disk_home "$DISK_HOME" \
  --arg cpu_model "$CPU_MODEL" \
  --argjson cpu_cores "$CPU_CORES" \
  --argjson cpu_usage "$cpu_data" \
  --arg cpu_color "$cpu_color" \
  --argjson services "$SERVICES" \
  --argjson top_cpu "$TOP_CPU" \
  --argjson top_mem "$TOP_MEM" \
  --argjson ports "$PORTS" \
  --argjson docker "$DOCKER_SERVICES" \
  '{
    generated: $generated,
    hostname: $hostname,
    ip_local: $ip_local,
    ip_pub: $ip_pub,
    uptime: $uptime,
    load_average: $load_avg,
    memory: {
      ram: $memory,
      swap: $swap
    },
    disks: [$disk_root, $disk_home],
    cpu: {
      model: $cpu_model,
      cores: $cpu_cores,
      usage: $cpu_usage,
      temperatures: $temp_cores
    },
    cpu_load_color: $cpu_color,
    services: $services,
    top_cpu: $top_cpu,
    top_mem: $top_mem,
    ports: $ports,
    docker: $docker
  }' > "$OUTPUT_FILE"

# 🧹 Nettoyage des anciens fichiers
find "$ARCHIVE_DIR" -type f -name "audit_*.json" | sort | head -n -21 | xargs -r rm

# 🔄 Mise à jour index.json
find "$ARCHIVE_DIR" -maxdepth 1 -name "audit_*.json" -printf "%f\n" | sort -r | jq -R . | jq -s . > "$ARCHIVE_DIR/index.json"

echo "✅ Rapport enrichi généré : $OUTPUT_FILE"
