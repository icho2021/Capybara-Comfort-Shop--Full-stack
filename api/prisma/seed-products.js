require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const samples = [
  {
    title: "Capybara Plush (Medium)",
    description: "Soft plush for cozy vibes.",
    price: 24.99,
    stock: 50,
    category: "Plush",
    imageUrl: "/images/placeholder-capybara.svg",
  },
  {
    title: "Blind Box — Capybara Friends",
    description: "Collectible surprise figure.",
    price: 12.5,
    stock: 120,
    category: "Blind Box",
    imageUrl: "/images/placeholder-capybara.svg",
  },
  {
    title: "Sticker Pack — Chill Capy",
    description: "Waterproof vinyl stickers.",
    price: 8.0,
    stock: 200,
    category: "Stickers",
    imageUrl: "/images/placeholder-capybara.svg",
  },
];

async function main() {
  for (const p of samples) {
    const existing = await prisma.product.findFirst({ where: { title: p.title } });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }
  console.log("Sample products ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
