#!/bin/sh
# O comando 'set -e' garante que o script irá falhar imediatamente se um comando falhar.
set -e

echo "✅ Entrypoint: Iniciando script de inicialização..."

# Executa o comando de migração do Prisma.
# Como este script roda no 'runtime', a DATABASE_URL estará disponível.
echo "🏁 Entrypoint: Rodando 'prisma migrate deploy'..."
npx prisma migrate deploy
echo "🎉 Entrypoint: Migração concluída com sucesso."

# O comando 'exec "$@"' é muito importante.
# Ele substitui o processo do shell pelo comando que foi passado como argumento
# no Dockerfile (no nosso caso, será 'node dist/main.js').
# Isso garante que o servidor Node.js seja o processo principal e receba
# os sinais de desligamento do Render corretamente.
exec "$@"