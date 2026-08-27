import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { PromptForm } from "../PromptForm";
import { deletePrompt } from "../actions";

export default async function EditPromptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [prompt, categories, tags] = await Promise.all([
    prisma.prompt.findUnique({
      where: { id },
      include: { tags: { select: { id: true } }, updatedBy: { select: { name: true } } },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!prompt) notFound();

  return (
    <>
      <PageHeader
        title="Edit prompt"
        action={
          <form action={deletePrompt}>
            <input type="hidden" name="id" value={prompt.id} />
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-wider text-red-400 transition hover:text-red-300"
            >
              Delete
            </button>
          </form>
        }
      />
      {prompt.updatedBy && (
        <p className="mb-4 font-mono text-[11px] text-ink-dim">
          last edited by {prompt.updatedBy.name} on {prompt.updatedAt.toISOString().slice(0, 10)}
        </p>
      )}
      <PromptForm
        categories={categories}
        tags={tags}
        defaults={{
          id: prompt.id,
          title: prompt.title,
          body: prompt.body,
          categoryId: prompt.categoryId,
          sortOrder: prompt.sortOrder,
          isBase: prompt.isBase,
          isActive: prompt.isActive,
          tagIds: prompt.tags.map((tag) => tag.id),
        }}
      />
    </>
  );
}
