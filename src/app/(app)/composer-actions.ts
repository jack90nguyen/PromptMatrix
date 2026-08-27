"use server";

import { prisma } from "@/lib/db";
import { collectTags, type CategoryPayload } from "@/lib/compose";
import { requireUser } from "@/lib/current-user";

export async function loadCategory(categoryId: string): Promise<CategoryPayload> {
  await requireUser();
  if (!categoryId) return { fragments: [], tags: [] };

  const prompts = await prisma.prompt.findMany({
    where: { categoryId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      body: true,
      sortOrder: true,
      isBase: true,
      tags: { select: { slug: true, name: true } },
    },
  });

  const fragments = prompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
    body: prompt.body,
    sortOrder: prompt.sortOrder,
    isBase: prompt.isBase,
    tagSlugs: prompt.tags.map((tag) => tag.slug),
    tagNames: Object.fromEntries(prompt.tags.map((tag) => [tag.slug, tag.name])),
  }));

  return {
    tags: collectTags(fragments),
    fragments: fragments.map(({ tagNames: _tagNames, ...fragment }) => fragment),
  };
}
