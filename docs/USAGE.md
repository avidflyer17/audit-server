# 📘 Audit Server Documentation

This document provides extra details on how to use the audit script and serve the resulting reports.

## 🚀 Installation

1. 📥 Clone the repository

   ```bash
   git clone https://github.com/your-org/audit-server.git
   cd audit-server
   ```

2. 🧰 Install dependencies

   ```bash
   sudo apt-get update
   sudo apt-get install -y bc jq curl lm-sensors sysstat
   ```

## 📊 Generating reports

The `generate-audit-json.sh` script collects system information and writes it as JSON files. By default, reports
are stored under `./audits`. You can override this location by setting the `BASE_DIR` environment variable:

```bash
BASE_DIR=/path/to/audits ./generate-audit-json.sh
```

Each execution creates a timestamped file in `archives/` and refreshes `index.json` with the list of available
reports. The structure of each JSON report is described in [REPORT_STRUCTURE.md](REPORT_STRUCTURE.md).

## 📂 Serving reports

Use the provided Docker and Nginx setup to serve the `audits` directory. Set `AUDIT_DIR` in `.env` to point to
your audit directory, then adjust any Traefik labels in `docker-compose.yaml` to match your environment:

```bash
docker compose up -d
```

## 🧪 Running tests

A minimal test script ensures the audit generator produces valid JSON output. Execute:

```bash
./tests/run.sh
```

The test creates a temporary audit directory, runs the generator and validates the resulting JSON file.
