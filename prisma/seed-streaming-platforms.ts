import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const streamingPlatforms = [
  // PRINCIPAIS (isFeatured: true)
  {
    nome: 'Netflix',
    slug: 'netflix',
    categoria: 'principal',
    isFeatured: true,
  },
  {
    nome: 'Prime Video',
    nomePt: 'Prime Video',
    slug: 'prime-video',
    categoria: 'principal',
    isFeatured: true,
  },
  {
    nome: 'Disney+',
    nomePt: 'Disney+',
    slug: 'disney-plus',
    categoria: 'principal',
    isFeatured: true,
  },
  {
    nome: 'Apple TV+',
    nomePt: 'Apple TV+',
    slug: 'apple-tv-plus',
    categoria: 'principal',
    isFeatured: true,
  },
  {
    nome: 'HBO Max',
    nomePt: 'HBO Max',
    slug: 'hbo-max',
    categoria: 'principal',
    isFeatured: true,
  },
  {
    nome: 'Globoplay',
    nomePt: 'Globoplay',
    slug: 'globoplay',
    categoria: 'principal',
    isFeatured: true,
  },
  {
    nome: 'Paramount+',
    nomePt: 'Paramount+',
    slug: 'paramount-plus',
    categoria: 'principal',
    isFeatured: true,
  },

  // BRASILEIRAS
  {
    nome: 'Looke',
    slug: 'looke',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Telecine',
    slug: 'telecine',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Claro',
    slug: 'claro',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Adrenalina Pura',
    slug: 'adrenalina-pura',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Reserva Imovision',
    slug: 'reserva-imovision',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Filmelier Plus',
    slug: 'filmelier-plus',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Box Brazil Play',
    slug: 'box-brazil-play',
    categoria: 'brasileira',
    isFeatured: false,
  },
  {
    nome: 'Belas Artes à La Carte',
    slug: 'belas-artes',
    categoria: 'brasileira',
    isFeatured: false,
  },

  // ESPECIALIZADAS
  {
    nome: 'MUBI',
    slug: 'mubi',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'Cultpix',
    slug: 'cultpix',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'DocAlliance Films',
    slug: 'docalliance',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'Oldflix',
    slug: 'oldflix',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'FilmBox+',
    slug: 'filmbox-plus',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'Runtime',
    slug: 'runtime',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'Filmicca',
    slug: 'filmicca',
    categoria: 'nicho',
    isFeatured: false,
  },
  {
    nome: 'Lionsgate+',
    slug: 'lionsgate-plus',
    categoria: 'nicho',
    isFeatured: false,
  },

  // GRATUITAS
  {
    nome: 'Libreflix',
    slug: 'libreflix',
    categoria: 'gratuita',
    isFeatured: false,
  },
  {
    nome: 'Pluto TV',
    slug: 'pluto-tv',
    categoria: 'gratuita',
    isFeatured: false,
  },
  {
    nome: 'Filmzie',
    slug: 'filmzie',
    categoria: 'gratuita',
    isFeatured: false,
  },
  {
    nome: 'Plex',
    slug: 'plex',
    categoria: 'gratuita',
    isFeatured: false,
  },
  {
    nome: 'Revry',
    slug: 'revry',
    categoria: 'gratuita',
    isFeatured: false,
  },

  // DIGITAIS
  {
    nome: 'Google Play Movies',
    slug: 'google-play',
    categoria: 'digital',
    isFeatured: false,
  },
  {
    nome: 'NetMovies',
    slug: 'netmovies',
    categoria: 'digital',
    isFeatured: false,
  },
  {
    nome: 'Mercado Play',
    slug: 'mercado-play',
    categoria: 'digital',
    isFeatured: false,
  },

  // INTERNACIONAIS
  {
    nome: 'Shahid VIP',
    slug: 'shahid-vip',
    categoria: 'internacional',
    isFeatured: false,
  },
  {
    nome: 'Sun Nxt',
    slug: 'sun-nxt',
    categoria: 'internacional',
    isFeatured: false,
  },
  {
    nome: 'Tentkotta',
    slug: 'tentkotta',
    categoria: 'internacional',
    isFeatured: false,
  },
  {
    nome: 'MovieMe',
    slug: 'movieme',
    categoria: 'internacional',
    isFeatured: false,
  },
];

async function main() {
  console.log('🎬 Iniciando população das plataformas de streaming...');
  
  for (const platform of streamingPlatforms) {
    const created = await prisma.streamingPlatform.upsert({
      where: { slug: platform.slug },
      update: platform,
      create: platform,
    });
    
    console.log(`✅ ${created.nome} (${created.categoria})`);
  }
  
  console.log(`\n🎯 ${streamingPlatforms.length} plataformas criadas com sucesso!`);
  
  // Mostrar estatísticas
  const stats = await prisma.streamingPlatform.groupBy({
    by: ['categoria'],
    _count: {
      categoria: true,
    },
  });
  
  console.log('\n📊 ESTATÍSTICAS:');
  stats.forEach(stat => {
    console.log(`   ${stat.categoria}: ${stat._count.categoria} plataformas`);
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
