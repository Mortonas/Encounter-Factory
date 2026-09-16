FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --prefer-offline --no-audit --no-fund --fetch-timeout=60000 --fetch-retries=1

COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-slim AS runtime

RUN apt-get update && apt-get install -y \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/Base ./Base

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
