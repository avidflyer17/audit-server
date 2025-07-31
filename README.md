# Audit Server

This project provides a lightweight way to collect and view system audit reports. A Bash script gathers metrics such as CPU usage, memory consumption, open ports and running services, then writes the results to JSON files. A small web frontend served by Nginx lets you browse these reports over time.

## Requirements

The `generate-audit-json.sh` script relies on a few common utilities:

- `mpstat` and `bc` for CPU statistics
- `jq` for JSON formatting
- `sensors` for temperature readings (optional)
- `curl` to retrieve the public IP address

Make sure these commands are available on the machine where you run the script.

## Generating an audit

Edit the `BASE_DIR` variable near the top of `generate-audit-json.sh` to point to the directory where reports should be stored. Then run:

```bash
./generate-audit-json.sh
```

Each execution creates an `audit_YYYY-MM-DD_HH-MM.json` file inside `archives/` and updates `index.json` with the list of available reports. You can schedule the script via cron to capture snapshots at regular intervals.

## Serving the reports

The `docker-compose.yaml` file starts an Nginx container that exposes the `audits` directory as static files. Launch it with:

```bash
docker-compose up -d
```

Open `http://<container-ip>/` in a browser to view the dashboard. The frontend (`audits/index.html` and `audits/scripts/viewer.js`) reads the JSON files and displays graphs and statistics using Chart.js.

## Directory structure

```
├── audits
│   ├── index.html         # Web interface
│   ├── scripts/viewer.js  # Frontend logic
│   └── favicon.ico
├── generate-audit-json.sh # Bash script to create audit_*.json files
├── docker-compose.yaml    # Nginx setup for serving the reports
└── nginx.conf             # Basic Nginx configuration
```

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
