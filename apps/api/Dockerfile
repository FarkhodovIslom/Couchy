FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Create persistent directories
RUN mkdir -p memory docs bugs templates prompts

EXPOSE 3001

CMD ["bun", "run", "src/main.ts"]
