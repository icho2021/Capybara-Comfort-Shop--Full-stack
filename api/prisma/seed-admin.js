require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Seed a deterministic admin account for local testing of admin-only endpoints.
async function main() {
  const email = "admin@capybara.shop";
  const passwordHash = await bcrypt.hash("Admin1234", 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Admin",
      role: "admin",
      passwordHash,
    },
    create: {
      name: "Admin",
      email,
      role: "admin",
      passwordHash,
    },
  });

  console.log("Admin ready: admin@capybara.shop / Admin1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
