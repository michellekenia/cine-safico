import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const youtubeLinks = [
  {
    scrapedMovieId: 'cmnhpq6vx00ndia2knfqlq2e9',
    service: 'YouTube',
    link: 'https://www.youtube.com/watch?v=GeUW01Ufgro',
  },
];

async function main() {
  console.log('🎬 Adicionando links do YouTube aos filmes...');
  
  for (const link of youtubeLinks) {
    const created = await prisma.streamingService.create({
      data: link,
    });
    
    console.log(`✅ ${created.service} - ${created.link}`);
  }
  
  console.log(`\n🎯 ${youtubeLinks.length} link(s) do YouTube adicionado(s) com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
