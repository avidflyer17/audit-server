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

   Node.js is required to run `server.js`.

## 📊 Generating reports

The `generate-audit-json.sh` script collects system information and writes it as JSON files. By
default, reports are stored under `/home/damswallace/docker/audits-nginx/audits`. You can override
this location by setting the `BASE_DIR` environment variable:

```bash
BASE_DIR=/tmp/audits ./generate-audit-json.sh
```

Each execution creates a timestamped file in `archives/` and refreshes `index.json` with the list of
available reports.

## 📂 Managing reports

Start the Node server to browse audits from the web interface:

```bash
node server.js
```

The dashboard lists existing reports from `archives/index.json`.

## 🌐 Serving the reports

`server.js` serves the static files under `audits` and exposes the `/api/reports` endpoint. After
starting it, open the reported address in a browser to view the dashboard.

## 🧪 Running tests

A minimal test script ensures the audit generator produces valid JSON output. Execute:

```bash
./tests/run.sh
```

The test creates a temporary audit directory, runs the generator and validates the resulting JSON file.
