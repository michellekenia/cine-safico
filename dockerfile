# 1. Imagem Base
FROM node:18-slim

# 2. Instalação do Google Chrome
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# Configura e expõe a porta para o Render
ARG PORT=10000
ENV PORT=${PORT}
EXPOSE ${PORT}

USER node

# Comando de Início: Extremamente simples, apenas inicia a aplicação.
# A própria aplicação agora cuidará da migração.
CMD [ "node", "dist/main.js" ]