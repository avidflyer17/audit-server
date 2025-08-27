# Audit Server

**Version 1.2.0** – this repository reflects the state of the project at release v1.2.0. All work that occurred
after this tag has been discarded.

Audit Server generates periodic JSON reports describing the state of a host and exposes them through a static web
viewer. The solution is composed of three parts:

* `generate-audit-json.sh` – Bash script that collects metrics (CPU, memory, disks, services, open ports and
  Docker containers) and stores them as timestamped JSON files.
* `audits/` – static HTML, CSS and JavaScript viewer that loads and renders those JSON files in a browser.
* `docker-compose.yaml` and `nginx.conf` – optional container setup to serve the viewer with Nginx.

The front‑end code is written as ES modules and bundled with [esbuild](https://esbuild.github.io/). Development
dependencies such as `esbuild`, `eslint` and `prettier` are listed in `package.json`.

## 📦 Prerequisites

The audit script relies on a handful of system utilities:

```text
bc, jq, curl, lm-sensors, sysstat (for mpstat), ss, awk, sed and grep
```

Docker is optional; if it is available, container statistics are included in the report. Node.js is required only
when rebuilding the front‑end bundle.

## 🛠️ Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/audit-server.git
   cd audit-server
   ```

2. Install the required packages listed above using your distribution’s package manager.

3. Generate a first report:

   ```bash
   ./generate-audit-json.sh
   ```

   Reports are written to `audits/archives` next to the script. Set `BASE_DIR` to use a different directory:

   ```bash
   BASE_DIR=/path/to/audits ./generate-audit-json.sh
   ```

For more detailed installation steps, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

## 🌐 Serving the reports

The repository includes a minimal Nginx setup. After creating at least one report, serve the viewer with Docker
Compose:

```bash
docker compose up -d
```

`AUDIT_DIR` in `.env` must point to the directory containing `audits` and `nginx.conf`. Traefik labels in the
compose file route requests to the container; adjust them to match your environment.

## 🧪 Testing

Run the test suite to verify that the audit generator produces a valid JSON file:

```bash
./tests/run.sh
```

## 🛠️ Development

If you modify the JavaScript modules under `audits/scripts`, rebuild the bundled viewer and run the linters:

```bash
npm install
npm run build   # bundle front-end scripts
npm run lint    # run ESLint
npm run format  # format sources with Prettier
```

## 📚 Additional documentation

* [docs/USAGE.md](docs/USAGE.md) – operating the audit script and viewer
* [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) – Docker/Nginx deployment guide
* [docs/REPORT_STRUCTURE.md](docs/REPORT_STRUCTURE.md) – JSON report reference

## 📄 License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
