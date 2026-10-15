# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace configs
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/types/package*.json ./packages/types/
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/

# Install dependencies across workspaces
RUN npm ci

# Copy source files
COPY packages/types ./packages/types
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Build types & generate Prisma client
RUN npm run build --workspace=@cit9/types
RUN npm run db:generate --workspace=@cit9/database
RUN npm run build --workspace=@cit9/database
RUN npm run build --workspace=@cit9/api

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/types/package*.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/database/package*.json ./packages/database/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["node", "apps/api/dist/src/main.js"]
