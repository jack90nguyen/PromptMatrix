import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { slugify } from "../src/lib/slug";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: requireEnv("DATABASE_URL") }),
});

const SAMPLE_TAGS = ["Mug", "Upload Photo", "T-Shirt"] as const;

const SAMPLE_PROMPTS = [
  {
    title: "Brand voice and output rules",
    sortOrder: 0,
    isBase: true,
    tags: [],
    body: [
      "You are writing marketing copy for a personalized gift store.",
      "Tone: warm, sincere, gift-giving oriented. Avoid hype and exclamation marks.",
      "Always describe the product truthfully - never invent specs that were not given.",
    ].join("\n"),
  },
  {
    title: "Mug 11oz - specs and print area",
    sortOrder: 10,
    isBase: false,
    tags: ["Mug"],
    body: [
      "Product: 11oz ceramic mug, white glossy finish, C-handle.",
      "Dimensions: 96mm height, 82mm diameter. Holds 325ml.",
      "Print area: 200mm x 85mm wraparound, dishwasher and microwave safe.",
    ].join("\n"),
  },
  {
    title: "Photo upload - customer requirements",
    sortOrder: 20,
    isBase: false,
    tags: ["Upload Photo"],
    body: [
      "This product is personalized from a photo the customer uploads.",
      "Mention that a clear, well-lit photo of the face works best.",
      "Reassure the customer that our design team reviews every photo before printing.",
    ].join("\n"),
  },
  {
    title: "T-Shirt - sizing and fabric",
    sortOrder: 10,
    isBase: false,
    tags: ["T-Shirt"],
    body: [
      "Product: unisex cotton t-shirt, 180gsm, pre-shrunk.",
      "Sizes S to 3XL. Runs true to size with a regular fit.",
    ].join("\n"),
  },
];

async function seedAdmin(): Promise<void> {
  const username = requireEnv("ADMIN_USERNAME");
  const passwordHash = await hashPassword(requireEnv("ADMIN_PASSWORD"));

  const user = await prisma.user.upsert({
    where: { username },
    update: { role: "ADMIN", isActive: true },
    create: { username, name: "Administrator", role: "ADMIN", passwordHash },
  });
  console.log(`admin ready: ${user.username}`);
}

async function seedSampleData(): Promise<void> {
  if ((await prisma.category.count()) > 0) {
    console.log("categories already exist - skipping sample data");
    return;
  }

  const category = await prisma.category.create({
    data: { name: "Product", slug: slugify("Product"), sortOrder: 0 },
  });

  const tags = await Promise.all(
    SAMPLE_TAGS.map((name) => prisma.tag.create({ data: { name, slug: slugify(name) } })),
  );
  const tagIdByName = new Map(tags.map((tag) => [tag.name, tag.id]));

  for (const prompt of SAMPLE_PROMPTS) {
    await prisma.prompt.create({
      data: {
        title: prompt.title,
        body: prompt.body,
        sortOrder: prompt.sortOrder,
        isBase: prompt.isBase,
        categoryId: category.id,
        tags: {
          connect: prompt.tags.map((name) => ({ id: tagIdByName.get(name)! })),
        },
      },
    });
  }
  console.log(`sample data: 1 category, ${tags.length} tags, ${SAMPLE_PROMPTS.length} prompts`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedSampleData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
