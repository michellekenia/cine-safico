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

# Adicionar binaryTargets corretos no prisma (garantido pelo schema.prisma)
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

# Copiar arquivos essenciais
COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção
RUN npm install --only=production

# Regenerar Prisma Client já no ambiente final (binário certo para o Render)
RUN npx prisma generate

# Copiar build da stage de build
COPY --from=builder /app/dist ./dist

# Expor porta do NestJS
EXPOSE 3000

# Iniciar aplicação
CMD ["node", "dist/main.js"]
