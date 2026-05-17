const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const address = '0xFd710EEb8fe08942F14FAE4D0C35d5E02686055A';

  const user = await prisma.user.upsert({
    where: { address },
    update: { isAdmin: true },
    create: { address, isAdmin: true },
  });

  console.log(`Seeded admin: ${user.address} isAdmin=${user.isAdmin}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
