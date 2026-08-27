import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { Button, Card, CardTitle, Empty, ErrorText, Input, Label, PageHeader } from "@/components/ui";
import { createTag, deleteTag, updateTag } from "./actions";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { prompts: true } } },
  });

  return (
    <>
      <PageHeader title="Tags" />
      {error && <div className="mb-5">
        <ErrorText>{error}</ErrorText>
      </div>}

      <Card className="mb-5">
        <CardTitle>New tag</CardTitle>
        <form action={createTag} className="flex items-end gap-3 p-4">
          <div className="flex-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Upload Photo" required />
          </div>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card>
        <CardTitle right={<span className="font-mono text-[11px] text-ink-dim">{tags.length}</span>}>
          All tags
        </CardTitle>
        {tags.length === 0 ? (
          <Empty>No tags yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {tags.map((tag) => (
              <li key={tag.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <form action={updateTag} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={tag.id} />
                  <Input name="name" defaultValue={tag.name} required className="max-w-xs" />
                  <Button type="submit" variant="ghost">
                    Save
                  </Button>
                </form>
                <code className="rounded bg-surface-hi px-1.5 py-0.5 font-mono text-[11px] text-ink-dim">
                  {tag.slug}
                </code>
                <span className="font-mono text-[11px] text-ink-dim">
                  {tag._count.prompts} prompts
                </span>
                <form action={deleteTag}>
                  <input type="hidden" name="id" value={tag.id} />
                  <button
                    type="submit"
                    className="font-mono text-[11px] text-red-400 transition hover:text-red-300"
                  >
                    delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
