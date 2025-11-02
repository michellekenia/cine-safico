import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeamento dos serviços existentes para as plataformas
const serviceMapping: Record<string, string> = {
  // Netflix
  'Netflix': 'netflix',
  'Netflix Standard with Ads': 'netflix',

  // Amazon/Prime Video
  'Amazon Video': 'prime-video',
  'Amazon Prime Video': 'prime-video',
  'Amazon Prime Video with Ads': 'prime-video',

  // Disney+
  'Disney Plus': 'disney-plus',

  // Apple TV+
  'Apple TV': 'apple-tv-plus',
  'Apple TV+': 'apple-tv-plus',
  'Apple TV Plus Amazon Channel': 'apple-tv-plus',

  // HBO Max
  'HBO Max': 'hbo-max',
  'HBO Max Amazon Channel': 'hbo-max',

  // Globoplay
  'Globoplay': 'globoplay',

  // Paramount+
  'Paramount Plus': 'paramount-plus',
  'Paramount Plus Premium': 'paramount-plus',
  'Paramount+ Amazon Channel': 'paramount-plus',

  // Looke
  'Looke': 'looke',
  'Looke Amazon Channel': 'looke',

  // Telecine
  'Telecine Amazon Channel': 'telecine',

  // Claro
  'Claro video': 'claro',
  'Claro tv+': 'claro',

  // MUBI
  'MUBI': 'mubi',
  'MUBI Amazon Channel': 'mubi',

  // Adrenalina Pura
  'Adrenalina Pura Amazon channel': 'adrenalina-pura',
  'Adrenalina Pura Apple TV channel': 'adrenalina-pura',

  // Reserva Imovision
  'Reserva Imovision': 'reserva-imovision',
  'Reserva Imovision Amazon Channel': 'reserva-imovision',

  // Outras brasileiras
  'Box Brazil Play Amazon Channel': 'box-brazil-play',
  'Filmelier Plus Amazon Channel': 'filmelier-plus',
  'Belas Artes à La Carte': 'belas-artes',

  // Especializadas
  'Cultpix': 'cultpix',
  'DocAlliance Films': 'docalliance',
  'Oldflix': 'oldflix',
  'FilmBox+': 'filmbox-plus',
  'Runtime': 'runtime',
  'Filmicca': 'filmicca',
  'Lionsgate+ Amazon Channels': 'lionsgate-plus',

  // Gratuitas
  'Libreflix': 'libreflix',
  'Pluto TV': 'pluto-tv',
  'Filmzie': 'filmzie',
  'Plex': 'plex',
  'Revry': 'revry',

  // Digitais
  'Google Play Movies': 'google-play',
  'NetMovies': 'netmovies',
  'Mercado Play': 'mercado-play',
  'MovieMe': 'movieme',

  // Internacionais
  'Shahid VIP': 'shahid-vip',
  'Sun Nxt': 'sun-nxt',
  'Tentkotta': 'tentkotta',
};

async function main() {
  console.log('🔗 Iniciando associação de filmes às plataformas...');
  
  // Buscar todos os filmes com seus serviços de streaming
  const movies = await prisma.scrapedMovie.findMany({
    include: {
      streamingServices: true,
    },
  });

  console.log(`📊 Encontrados ${movies.length} filmes para processar`);

  let processedMovies = 0;
  let totalAssociations = 0;
  let skippedServices = new Set<string>();
  let errorCount = 0;

  for (const movie of movies) {
    const platformSlugs = new Set<string>();
    
    // Analisar cada serviço de streaming do filme
    for (const service of movie.streamingServices) {
      const platformSlug = serviceMapping[service.service];
      
      if (platformSlug) {
        platformSlugs.add(platformSlug);
      } else {
        skippedServices.add(service.service);
      }
    }

    // Associar o filme às plataformas identificadas
    if (platformSlugs.size > 0) {
      try {
        await prisma.scrapedMovie.update({
          where: { id: movie.id },
          data: {
            streamingPlatforms: {
              connect: Array.from(platformSlugs).map(slug => ({ slug })),
            },
          },
        });
        
        processedMovies++;
        totalAssociations += platformSlugs.size;
        
        console.log(`✅ ${movie.title}: conectado a [${Array.from(platformSlugs).join(', ')}]`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar ${movie.title}:`, error.message);
      }
    } else {
      console.log(`⚠️ ${movie.title}: nenhuma plataforma identificada`);
    }
  }

  console.log('\n📊 RELATÓRIO FINAL:');
  console.log(`✅ Filmes processados: ${processedMovies}`);
  console.log(`🔗 Total de associações: ${totalAssociations}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`⚠️ Serviços não mapeados: ${skippedServices.size}`);
  
  if (skippedServices.size > 0) {
    console.log('\n⚠️ Serviços não encontrados no mapeamento:');
    Array.from(skippedServices).sort().forEach(service => {
      console.log(`   - "${service}"`);
    });
  }

  // Estatísticas das plataformas após associação
  console.log('\n📈 FILMES POR PLATAFORMA:');
  const platformStats = await prisma.streamingPlatform.findMany({
    include: {
      _count: {
        select: { movies: true },
      },
    },
    orderBy: [
      { isFeatured: 'desc' },
      { movies: { _count: 'desc' } },
    ],
  });

  platformStats.forEach(platform => {
    if (platform._count.movies > 0) {
      console.log(`   ${platform.nome}: ${platform._count.movies} filmes`);
    }
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
