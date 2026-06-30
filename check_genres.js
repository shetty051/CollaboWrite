const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const genres = await prisma.genre.findMany();
  console.log("Genres in DB:", genres);
}

main().catch(console.error).finally(() => prisma.$disconnect());
