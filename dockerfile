# Começamos com uma imagem base do Node.js.
FROM node:18-slim

# 1. Instala o Google Chrome e suas dependências
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

# 👇 MUDANÇA #1: Copiamos nosso script para dentro do contêiner 👇
COPY entrypoint.sh /app/entrypoint.sh

# Configura e expõe a porta para o Render
ARG PORT=10000
ENV PORT=${PORT}
EXPOSE ${PORT}

USER node

# 👇 MUDANÇA #2: Definimos o entrypoint e o CMD 👇
# O ENTRYPOINT é o "checklist de pré-voo".
ENTRYPOINT ["/app/entrypoint.sh"]
# O CMD é o comando principal que o checklist irá executar no final.
CMD [ "node", "dist/main.js" ]