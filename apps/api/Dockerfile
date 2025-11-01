FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY apps/desktop/package.json ./apps/desktop/
COPY packages/ai/package.json ./packages/ai/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/tattoo-guild/package.json ./packages/tattoo-guild/
COPY packages/types/package.json ./packages/types/
COPY packages/workflow/package.json ./packages/workflow/

# Install dependencies
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Build the API
RUN npm run build --filter=@galaos/api

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 galaos

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER galaos

EXPOSE 3001

ENV PORT=3001

CMD ["node", "apps/api/dist/index.js"]
