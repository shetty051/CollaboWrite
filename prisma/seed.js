require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

const genres = [
  'Horror', 'Thriller', 'Poetry', 'Romance', 'Fantasy', 
  'Sci-Fi', 'Mystery', 'Drama', 'Comedy', 'Non-fiction'
];

async function main() {
  console.log('Seeding genres...');
  for (const genreName of genres) {
    await prisma.genre.upsert({
      where: { name: genreName },
      update: {},
      create: { name: genreName },
    });
  }
  console.log('Genres seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
