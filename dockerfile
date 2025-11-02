# ========================
# 1️⃣ Stage de build
# ========================
FROM node:18-bullseye AS builder

WORKDIR /app

# Copiar arquivos essenciais primeiro
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências de desenvolvimento
RUN npm install

# Gerar Prisma client
RUN npx prisma generate

# Copiar código e fazer build
COPY . .
RUN npm run build

# ========================
# 2️⃣ Stage final (produção)
# ========================
FROM node:18-bullseye-slim AS production

WORKDIR /app

ENV NODE_ENV=production

# Instalar dependências do sistema para Chrome/Chromium
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


# Copiar arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências de produção
RUN npm install --only=production

# Gerar Prisma client para produção
RUN npx prisma generate

# Copiar build
COPY --from=builder /app/dist ./dist

# Criar usuário não-root
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Mudar para usuário não-root
USER pptruser

EXPOSE 3000

CMD ["node", "dist/src/main.js"]