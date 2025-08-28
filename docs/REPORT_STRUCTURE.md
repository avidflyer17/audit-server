# 🧾 Audit Report Structure

The `generate-audit-json.sh` script outputs a JSON file summarizing system metrics. This specification describes
the format used in Audit Server version 1.2.0. The top-level object contains:

- `generated`: human-readable timestamp of report generation.
- `hostname`: system hostname.
- `ip_local`: first local IP address.
- `ip_pub`: public IP address or `"N/A"` if unreachable.
- `uptime`: output of `uptime -p`.
- `load_average`: the 1, 5 and 15 minute load averages.
- `memory`: object with RAM and swap statistics.
  - `ram`: total, used, free, shared, `buff_cache`, available.
  - `swap`: total, used, free.
- `disks`: array with entries for `/` and `/home` including filesystem, size, used, available, `used_percent`,
  mountpoint.
- `cpu`: object with processor details.
  - `model`: CPU model name.
  - `cores`: number of cores.
  - `usage`: array of `{ core, usage }` records.
  - `temperatures`: array of `{ core, temp }` if available.
- `cpu_load_color`: traffic-light color representing overall CPU usage.
- `services`: array of active systemd service names.
- `top_cpu`: list of processes consuming the most CPU (`pid`, `cmd`, `cpu`, `mem`).
- `top_mem`: list of processes consuming the most memory (`pid`, `cmd`, `mem`, `cpu`).
- `docker`: object with `containers` array, each entry containing:
  - `name`, `state`, `health`, `uptime`.
  - `has_stats`: `true` if resource statistics are available.
  - `cpu_pct`, `mem_pct`: usage percentages when `has_stats` is true.
  - `mem_used_bytes`, `mem_limit_bytes`: memory usage and limit in bytes.

A minimal example:

```json
{
  "generated": "01/01/2024 à 12:00",
  "hostname": "server1",
  "ip_local": "192.168.1.10",
  "ip_pub": "203.0.113.5",
  "uptime": "up 5 days",
  "load_average": "0.00,0.01,0.05",
  "memory": {
    "ram": { "total": "7.8Gi", "used": "1.2Gi", "free": "6.6Gi" },
    "swap": { "total": "0B", "used": "0B", "free": "0B" }
  },
  "disks": [
    {
      "filesystem": "/dev/sda1",
      "size": "100G",
      "used": "20G",
      "available": "80G",
      "used_percent": "20%",
      "mountpoint": "/"
    }
  ],
  "cpu": {
    "model": "Intel(R) Xeon(R)",
    "cores": 4,
    "usage": [ { "core": 0, "usage": 5.0 } ],
    "temperatures": []
  },
  "cpu_load_color": "green",
  "services": ["sshd.service"],
  "top_cpu": [],
  "top_mem": [],
  "docker": { "containers": [] }
}
```

This example is not exhaustive but illustrates the keys and nesting used by the audit report.

