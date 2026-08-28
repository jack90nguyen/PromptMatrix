import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { Button, Card, CardTitle, Empty, ErrorText, Input, Label, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/ConfirmForm";
import { createCategory, deleteCategory, updateCategory } from "./actions";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { prompts: true } } },
  });

  return (
    <>
      <PageHeader title="Categories" />
      {error && <div className="mb-5">
        <ErrorText>{error}</ErrorText>
      </div>}

      <Card className="mb-5">
        <CardTitle>New category</CardTitle>
        <form action={createCategory} className="grid gap-3 p-4 sm:grid-cols-[1fr_2fr_6rem_auto]">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Product" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="sortOrder">Order</Label>
            <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={0} />
          </div>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle right={<span className="font-mono text-[11px] text-ink-dim">{categories.length}</span>}>
          All categories
        </CardTitle>
        {categories.length === 0 ? (
          <Empty>No categories yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {categories.map((category) => (
              <li key={category.id} className="p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr_6rem_auto]">
                  <form action={updateCategory} className="contents">
                    <input type="hidden" name="id" value={category.id} />
                    <Input name="name" defaultValue={category.name} required />
                    <Input
                      name="description"
                      defaultValue={category.description ?? ""}
                      placeholder="Optional"
                    />
                    <Input name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} />
                    <div className="flex items-center">
                      <Button type="submit" variant="ghost">
                        Save
                      </Button>
                    </div>
                  </form>
                </div>
                <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-ink-dim">
                  <code className="rounded bg-surface-hi px-1.5 py-0.5">{category.slug}</code>
                  <span>{category._count.prompts} prompts</span>
                  <ConfirmForm
                    action={deleteCategory}
                    title="Delete category"
                    message={
                      category._count.prompts === 0
                        ? `"${category.name}" holds no prompts.`
                        : `"${category.name}" still holds ${category._count.prompts} prompt${
                            category._count.prompts === 1 ? "" : "s"
                          }. The database refuses to delete a category with prompts, so this will fail until you move or delete them first.`
                    }
                  >
                    <input type="hidden" name="id" value={category.id} />
                  </ConfirmForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
