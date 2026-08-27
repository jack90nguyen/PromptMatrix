import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { buildMatrix } from "@/lib/matrix";
import { ComposerClient } from "./ComposerClient";

export default async function ComposerPage() {
  await requireUser();

  const [categories, tags, prompts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    prisma.prompt.findMany({
      where: { isActive: true },
      select: { categoryId: true, isBase: true, tags: { select: { slug: true } } },
    }),
  ]);

  const matrix = buildMatrix(
    categories,
    tags,
    prompts.map((prompt) => ({
      categoryId: prompt.categoryId,
      isBase: prompt.isBase,
      tagSlugs: prompt.tags.map((tag) => tag.slug),
    })),
  );

  return <ComposerClient categories={categories} matrix={matrix} />;
}
