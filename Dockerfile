FROM node:20-bookworm-slim

WORKDIR /app
COPY . .

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bash curl jq bc sysstat lm-sensors iproute2 procps coreutils findutils util-linux ca-certificates docker.io \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && mkdir -p /app/audits/archives \
    && chmod +x /app/generate-audit-json.sh

ENV PORT=8080 NODE_ENV=production TZ=Europe/Paris
EXPOSE 8080
CMD ["node","server.js"]
