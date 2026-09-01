# Dockerfile OpenSSL requirement

The previous production failure was Prisma selecting `openssl-1.1.x` on `node:20-bookworm-slim`.

Use this pattern in **both** builder and runtime stages:

```dockerfile
FROM node:20-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# install dependencies
# prisma generate
# npm build

FROM node:20-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# copy runtime application
```

Validate inside the image:

```bash
docker run --rm IMAGE openssl version
```

and validate Prisma startup with:

```bash
docker compose exec backend node -e \
"require('http').get('http://127.0.0.1:3000/health', r => { console.log(r.statusCode); process.exit(r.statusCode === 200 ? 0 : 1) })"
```
