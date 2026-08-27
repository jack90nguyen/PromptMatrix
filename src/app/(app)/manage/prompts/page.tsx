import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { Button, Card, Empty, PageHeader } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { PromptFilters } from "./PromptFilters";
import { PromptGrid } from "./PromptGrid";
import type { PromptCardData } from "./PromptCard";

const LIST_LIMIT = 200;

type Search = {
  q?: string;
  category?: string;
  tags?: string;
  mode?: string;
  status?: string;
  base?: string;
};

function buildWhere(search: Search): Prisma.PromptWhereInput {
  const filters: Prisma.PromptWhereInput[] = [];
  const query = search.q?.trim();
  const tagSlugs = (search.tags ?? "").split(",").filter(Boolean);

  if (query) {
    filters.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { body: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (search.category) filters.push({ category: { slug: search.category } });
  if (search.base === "1") filters.push({ isBase: true });
  if (search.status === "active") filters.push({ isActive: true });
  if (search.status === "inactive") filters.push({ isActive: false });

  if (tagSlugs.length > 0) {
    filters.push(
      search.mode === "AND"
        ? { AND: tagSlugs.map((slug) => ({ tags: { some: { slug } } })) }
        : { tags: { some: { slug: { in: tagSlugs } } } },
    );
  }

  return filters.length > 0 ? { AND: filters } : {};
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireUser();
  const search = await searchParams;
  const where = buildWhere(search);

  const [rows, total, categories, tags] = await Promise.all([
    prisma.prompt.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      take: LIST_LIMIT,
      include: {
        category: { select: { name: true } },
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        updatedBy: { select: { name: true } },
      },
    }),
    prisma.prompt.count({ where }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, _count: { select: { prompts: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true, _count: { select: { prompts: true } } },
    }),
  ]);

  const prompts: PromptCardData[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    sortOrder: row.sortOrder,
    isBase: row.isBase,
    isActive: row.isActive,
    categoryName: row.category.name,
    tagNames: row.tags.map((tag) => tag.name),
    updatedByName: row.updatedBy?.name ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Prompts"
        action={
          <Link href="/manage/prompts/new">
            <Button type="button">+ New prompt</Button>
          </Link>
        }
      />

      <PromptFilters
        total={total}
        categories={categories.map((item) => ({
          slug: item.slug,
          name: item.name,
          count: item._count.prompts,
        }))}
        tags={tags.map((item) => ({
          slug: item.slug,
          name: item.name,
          count: item._count.prompts,
        }))}
      />

      {prompts.length === 0 ? (
        <Card>
          <Empty>No prompts match these filters.</Empty>
        </Card>
      ) : (
        <PromptGrid prompts={prompts} />
      )}

      {total > prompts.length && (
        <p className="mt-4 font-mono text-[11px] text-ink-dim">
          Showing {prompts.length} of {total}. Narrow the filters to see the rest.
        </p>
      )}
    </>
  );
}
