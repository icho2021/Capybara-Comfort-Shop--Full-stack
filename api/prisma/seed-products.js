require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { samples } = require("./seed-products.samples");

const prisma = new PrismaClient();

async function main() {
  for (const p of samples) {
    const existing = await prisma.product.findFirst({ where: { title: p.title } });
    if (!existing) {
      await prisma.product.create({ data: p });
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          imageUrl: p.imageUrl,
          category: p.category,
          description: p.description,
          price: p.price,
          stock: p.stock,
        },
      });
    }
  }
  console.log("Sample products ready (static /images/* demo art).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
