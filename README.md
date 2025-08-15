# Audit Server

This project provides a lightweight way to collect and view system audit reports. A Bash script gathers
metrics such as CPU usage, memory consumption, open ports, running services, and Docker container stats,
then writes the results to JSON files. Static files under `audits` display the reports through a simple web
interface that can be served by Nginx.

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

3. ▶️ Generate your first audit

   ```bash
   ./generate-audit-json.sh
   ```

By default, the script writes reports to `./audits/archives`. Override the location by setting the `BASE_DIR`
environment variable:

```bash
BASE_DIR=/path/to/audits ./generate-audit-json.sh
```

## 🌐 Serving the reports

Use the provided `docker-compose.yaml` and `nginx.conf` to serve the `audits` directory through Nginx and expose
it behind Traefik. Set `AUDIT_DIR` in `.env` to point to the directory containing `audits` and `nginx.conf`, then
start the service:

```bash
docker compose up -d
```

## 🗂️ Directory structure

```
├── audits               # Web interface and generated reports
├── generate-audit-json.sh
├── docker-compose.yaml
└── nginx.conf
```

## 📚 Documentation

Additional usage instructions are available in the [docs](docs/USAGE.md) directory. Deployment options are
covered in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Details about the JSON audit report structure can be
found in [docs/REPORT_STRUCTURE.md](docs/REPORT_STRUCTURE.md).

## 🧪 Testing

Run the provided test script to generate a sample report and validate its JSON structure:

```bash
./tests/run.sh
```

## 🛠️ Development

JavaScript assets are split into ES modules and bundled for the browser. Install Node.js
dependencies and use the provided npm scripts:

```bash
npm install
npm run build   # bundle front-end scripts
npm run lint    # run ESLint
npm run format  # format sources with Prettier
```

## 📄 License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
