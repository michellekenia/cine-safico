# Começamos com uma imagem base do Node.js. Não há múltiplos estágios.
FROM node:18-slim

# 1. Instala o Google Chrome e todas as suas dependências do sistema operacional
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência e instala os pacotes npm
COPY package*.json ./
# Instalamos tudo, incluindo devDependencies, pois o Prisma CLI é necessário para build e migração
RUN npm install

# Copia todo o resto do nosso código para o contêiner
COPY . .

# 2. Gera o cliente Prisma específico para este ambiente Linux
RUN npx prisma generate

# 3. Constrói a aplicação NestJS, criando a pasta /dist
RUN npm run build

# 4. Roda as migrações do banco de dados (acontece uma vez durante o build)
RUN npx prisma migrate deploy

# 5. Configura e expõe a porta para o Render
ARG PORT=10000
ENV PORT=${PORT}
EXPOSE ${PORT}

# Troca para um usuário não-root por segurança
USER node

# 6. Comando final para iniciar o servidor (agora limpo e direto)
CMD [ "node", "dist/main.js" ]