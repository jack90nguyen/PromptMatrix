import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { PageHeader } from "@/components/ui";
import { PromptForm } from "../PromptForm";

export default async function NewPromptPage() {
  await requireUser();

  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="New prompt" />
      <PromptForm categories={categories} tags={tags} />
    </>
  );
}
