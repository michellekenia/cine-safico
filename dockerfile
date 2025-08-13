# --- Estágio 1: Builder ---
# Instala todas as dependências (incluindo dev) e faz o build da aplicação.
FROM node:18-slim AS builder

# Instala dependências do sistema para o Puppeteer
RUN apt-get update && apt-get install -yq \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation \
    libappindicator1 libnss3 lsb-release xdg-utils wget --no-install-recommends

WORKDIR /app

# Copia os arquivos de dependência e instala TUDO (incluindo devDependencies)
COPY package*.json ./
RUN npm install

# Copia o resto do código
COPY . .

# Gera o Prisma Client para garantir que esteja atualizado
RUN npx prisma generate

# Constrói a aplicação
RUN npm run build

# --- Estágio 2: Runner ---
# Esta é a imagem final, muito menor, que irá para produção.
FROM node:18-slim AS runner

WORKDIR /app

# Instala novamente as dependências do sistema para o Puppeteer
RUN apt-get update && apt-get install -yq \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation \
    libappindicator1 libnss3 lsb-release xdg-utils wget --no-install-recommends

# --- INÍCIO DOS COMANDOS DE DIAGNÓSTICO ---
RUN echo "================================================="
RUN echo "Buscando o executável do Google Chrome..."
RUN echo "--- Tentativa com 'which':"
RUN which google-chrome-stable || echo "COMANDO 'which google-chrome-stable' NÃO ENCONTROU."
RUN which google-chrome || echo "COMANDO 'which google-chrome' NÃO ENCONTROU."
RUN echo "--- Verificando diretórios comuns:"
RUN ls -la /usr/bin | grep chrome || echo "Nenhum 'chrome' encontrado em /usr/bin"
RUN ls -la /opt/google/chrome || echo "Diretório /opt/google/chrome não encontrado"
RUN echo "================================================="
# --- FIM DOS COMANDOS DE DIAGNÓSTICO ---

# Copia apenas os arquivos de dependência de produção
COPY --from=builder /app/package*.json ./

# Instala SOMENTE as dependências de produção
RUN npm install --omit=dev

# Copia os artefatos do build e os arquivos necessários do estágio "builder"
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

# Expõe a porta que a aplicação vai usar (a Render gerencia isso automaticamente)
# A porta é definida pela variável de ambiente PORT
# Define um argumento de build para a porta, com 10000 como padrão (o valor do Render)
ARG PORT=10000
# Define a variável de ambiente dentro do contêiner
ENV PORT=${PORT}
# Expõe a porta definida pela variável de ambiente
EXPOSE ${PORT}

# O usuário padrão do Node.js é não-root, o que é uma boa prática de segurança
USER node

# Comando para iniciar a aplicação
CMD [ "node", "dist/main.js" ]
