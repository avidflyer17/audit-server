# 🚀 Deployment Guide

This guide explains how to serve audit reports through Nginx running in Docker with Traefik. It applies to
Audit Server version 1.3.1.

1. Generate audits (or schedule the script):

   ```bash
   ./generate-audit-json.sh
   ```

   Reports are stored under `./audits/archives` by default. Use `BASE_DIR` to change the location.

2. Start the container:

   ```bash
   docker compose up -d
   ```

The `docker-compose.yaml` uses an `AUDIT_DIR` variable from `.env` to mount the audit directory and `nginx.conf`,
exposes port 80 on the `br-dams` network and sets Traefik labels for routing `audit.damswallace.fr`. Adjust
paths, network settings or labels to fit your environment.
