# Use uma imagem oficial do Node.js como base. A versão 'slim' é mais leve.
FROM node:18-slim

# Instala as dependências do sistema operacional necessárias para o Chromium (Puppeteer)
# Dentro do Docker, temos permissão para fazer isso!
RUN apt-get update && apt-get install -yq \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    --no-install-recommends

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência e instala os pacotes npm
# Isso otimiza o cache de build do Docker
COPY package*.json ./
RUN npm install

# Copia o schema do Prisma para gerar o cliente
COPY prisma ./prisma/

# Gera o cliente Prisma para o ambiente Linux do contêiner
RUN npx prisma generate

# Copia o resto do código da sua aplicação
COPY . .

# Faz o build da aplicação NestJS
RUN npm run build

# Expõe a porta que sua aplicação usa (ajuste se for diferente)
EXPOSE 3000

# O comando para iniciar sua aplicação quando o contêiner rodar
CMD [ "node", "dist/main" ]