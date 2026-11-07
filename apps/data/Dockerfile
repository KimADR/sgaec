FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
# Prisma CLI is used only by the explicit maintenance service.
RUN npm install --include=dev --no-audit --no-fund
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN DATABASE_URL="postgresql://127.0.0.1:5432/build?schema=sgaec" npx prisma generate
COPY src ./src
COPY tests ./tests
CMD ["node", "src/index.mjs"]
