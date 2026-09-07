import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { ComposerClient } from "./ComposerClient";

export default async function ComposerPage() {
  await requireUser();

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  return <ComposerClient categories={categories} />;
}
