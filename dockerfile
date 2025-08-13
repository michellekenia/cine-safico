# ========================
# 1️⃣ Stage de build
# ========================
FROM node:18-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos essenciais primeiro (para cache eficiente)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências de desenvolvimento (incluindo Nest CLI)
RUN npm install

# Adicionar binaryTargets corretos no prisma
RUN npx prisma generate

# Copiar restante do código
COPY . .

# Compilar a aplicação NestJS
RUN npm run build

# ========================
# 2️⃣ Stage final (produção)
# ========================
FROM node:18-alpine AS production

WORKDIR /app

# Definir NODE_ENV para produção
ENV NODE_ENV=production

# Instalar dependências do Chromium de forma mais completa
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-dejavu \
    ttf-droid \
    ttf-liberation \
    udev \
    xvfb \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Definir variáveis de ambiente para Puppeteer e Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV DISPLAY=:99

# Copiar arquivos essenciais
COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção
RUN npm install --only=production

# Regenerar Prisma Client já no ambiente final
RUN npx prisma generate

# Copiar build da stage de build
COPY --from=builder /app/dist ./dist

# Criar diretórios necessários com permissões corretas
RUN mkdir -p /app/tmp && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# Mudar para usuário não-root
USER nextjs

# Expor porta do NestJS
EXPOSE 3000

# Script de inicialização com Xvfb para ambiente headless
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 -nolisten tcp & node dist/main.js"]