# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfiles first so npm ci benefits from Docker layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the build context (see .dockerignore for exclusions).
COPY . .

RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
# nginx default CMD starts the server in the foreground — no override needed.
