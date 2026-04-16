require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const { popularTitleOrder } = require("./seed-products.samples");
const { STORE_BACKGROUND_URL } = require("./storefront-background.path");

const BACKGROUND_KEY = "storefront.backgroundUrl";
const POPULAR_KEY = "storefront.popularProductIds";

async function main() {
  await prisma.appSetting.upsert({
    where: { key: BACKGROUND_KEY },
    create: { key: BACKGROUND_KEY, value: STORE_BACKGROUND_URL },
    update: { value: STORE_BACKGROUND_URL },
  });

  const products = await prisma.product.findMany({
    where: { title: { in: popularTitleOrder }, isActive: true },
    select: { id: true, title: true },
  });
  const byTitle = Object.fromEntries(products.map((p) => [p.title, p.id]));
  const ids = popularTitleOrder.map((t) => byTitle[t]).filter(Boolean);

  if (ids.length > 0) {
    await prisma.appSetting.upsert({
      where: { key: POPULAR_KEY },
      create: { key: POPULAR_KEY, value: JSON.stringify(ids) },
      update: { value: JSON.stringify(ids) },
    });
  }

  console.log("Storefront settings: background + popular products (if products exist).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
