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
  const { title, slug, description, featured, order, movies } = parseArgs();

  if (!title || !slug || !movies) {
    console.error(
      'Uso: npx ts-node prisma/create-movie-list.ts --title=<título> --slug=<slug-da-lista> --movies=<slug1,slug2,...> [--description=<texto>] [--featured=true] [--order=<número>]',
    );
    console.error(
      'Exemplo: npx ts-node prisma/create-movie-list.ts --title="Feriado Corpus Christi" --slug=feriado-corpus-christi --movies=novitiate,dark-habits,holy-camp --featured=true --order=1',
    );
    process.exit(1);
  }

  const movieSlugs = movies.split(',').map((s) => s.trim());

  const foundMovies = await prisma.scrapedMovie.findMany({
    where: { slug: { in: movieSlugs } },
    select: { id: true, slug: true, title: true },
  });

  const foundSlugs = new Set(foundMovies.map((m) => m.slug));
  const missingSlugs = movieSlugs.filter((s) => !foundSlugs.has(s));
  if (missingSlugs.length > 0) {
    console.error(`❌ Slugs não encontrados: ${missingSlugs.join(', ')}`);
    process.exit(1);
  }

  const list = await prisma.movieList.upsert({
    where: { slug },
    update: {
      title,
      description: description ?? null,
      isFeatured: featured === 'true',
      order: order ? Number(order) : 0,
    },
    create: {
      title,
      slug,
      description: description ?? null,
      isFeatured: featured === 'true',
      order: order ? Number(order) : 0,
    },
  });

  await prisma.movieList.update({
    where: { id: list.id },
    data: { movies: { connect: foundMovies.map((m) => ({ id: m.id })) } },
  });

  console.log(`✅ Lista "${list.title}" (${list.slug}) pronta com ${foundMovies.length} filme(s):`);
  for (const m of foundMovies) {
    console.log(`   - ${m.title}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
