import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs() {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

async function main() {
  const { slug, service, link, platform } = parseArgs();

  if (!slug || !service || !link || !platform) {
    console.error(
      'Uso: npx ts-node prisma/add-alternative-link.ts --slug=<slug-do-filme> --service=<nome-do-servico> --link=<url> --platform=<slug-da-plataforma>',
    );
    console.error(
      'Exemplo: npx ts-node prisma/add-alternative-link.ts --slug=the-sermon --service="YouTube" --link="https://youtube.com/..." --platform=youtube',
    );
    process.exit(1);
  }

  const movie = await prisma.scrapedMovie.findUnique({ where: { slug } });
  if (!movie) {
    console.error(`❌ Nenhum filme encontrado com o slug "${slug}".`);
    process.exit(1);
  }

  const streamingPlatform = await prisma.streamingPlatform.findUnique({
    where: { slug: platform },
  });
  if (!streamingPlatform) {
    console.error(`❌ Nenhuma plataforma encontrada com o slug "${platform}".`);
    process.exit(1);
  }

  const created = await prisma.streamingService.create({
    data: { scrapedMovieId: movie.id, service, link },
  });

  await prisma.scrapedMovie.update({
    where: { id: movie.id },
    data: { streamingPlatforms: { connect: { id: streamingPlatform.id } } },
  });

  console.log(`✅ Link adicionado a "${movie.title}": ${created.service} - ${created.link}`);
  console.log(`✅ Plataforma "${streamingPlatform.nome}" conectada ao filme.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
