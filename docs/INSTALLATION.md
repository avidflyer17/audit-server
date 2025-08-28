# 🛠️ Installation Guide

This guide explains how to set up Audit Server version 1.3.0 from scratch.

## 1. Clone the repository

```bash
git clone https://github.com/your-org/audit-server.git
cd audit-server
```

## 2. Install required packages

The audit script depends on common GNU utilities and a few monitoring tools. Install them with your package
manager:

```bash
sudo apt-get update
sudo apt-get install -y bc jq curl lm-sensors sysstat iproute2
```

> `ss`, `awk`, `sed` and `grep` are provided by the base system. Docker is optional but enables container
> statistics in the reports.

## 3. Generate a report

Run the generator once to create the directory structure and the first JSON report:

```bash
./generate-audit-json.sh
```

By default, reports are stored under `audits/archives`. To place them elsewhere, use the `BASE_DIR` environment
variable:

```bash
BASE_DIR=/path/to/audits ./generate-audit-json.sh
```

## 4. View reports

Open `audits/index.html` in a browser or serve the directory using the provided Docker Compose configuration:

```bash
docker compose up -d
```

Set `AUDIT_DIR` in `.env` to the path that contains the `audits` folder and `nginx.conf`.

## 5. Optional: rebuild front‑end assets

If you change files under `audits/scripts`, install Node.js dependencies and rebuild the bundle:

```bash
npm install
npm run build
```

The repository already includes a prebuilt bundle, so these commands are only required when modifying the
JavaScript sources.

