# 1. Imagem Base
FROM node:18-slim

# 2. Instalação do Google Chrome (se necessário para scraping)
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Define diretório de trabalho
WORKDIR /app

# 4. Copia package.json e instala dependências
COPY package*.json ./
RUN npm install

# 5. Copia código da aplicação
COPY . .

# 6. Gera o Prisma Client e builda a aplicação
RUN npx prisma generate
RUN npm run build

# 7. Expõe a porta usada pelo Render
EXPOSE 3000

# 8. Inicia a aplicação já rodando a migração
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
