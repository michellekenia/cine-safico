# -------- STAGE 1: BUILDER (compila o projeto e gera Prisma Client) --------
FROM node:18-slim AS builder

WORKDIR /app

# Copia manifestos e instala TODAS as deps (inclui devDependencies)
COPY package*.json ./
RUN npm ci

# Copia schema do Prisma antes para permitir o generate
COPY prisma ./prisma
RUN npx prisma generate

# Copia o restante do código e builda
COPY . .
RUN npm run build

# Remove devDependencies deixando node_modules pronto para produção (com Client gerado)
RUN npm prune --omit=dev


# -------- STAGE 2: RUNNER (somente runtime + Chrome) --------
FROM node:18-slim AS runner

# Instala Google Chrome para o scraping
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
# NÃO fixe PORT aqui — o Render injeta PORT dinamicamente
# EXPOSE é apenas informativo; o Render detecta a porta pelo listen do app
EXPOSE 3000

# Copia artefatos do builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Sobe a API
CMD ["node", "dist/main.js"]
