"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { categorySchema } from "@/lib/schemas";
import { slugify } from "@/lib/slug";

const PATH = "/manage/categories";

function back(error?: string): never {
  redirect(error ? `${PATH}?error=${encodeURIComponent(error)}` : PATH);
}

function readForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
}

export async function createCategory(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = readForm(formData);
  if (!parsed.success) back(parsed.error.issues[0]?.message);

  const { name, description, sortOrder } = parsed.data;
  try {
    await prisma.category.create({
      data: { name, slug: slugify(name), description: description || null, sortOrder },
    });
  } catch {
    back(`Category "${name}" already exists`);
  }
  revalidatePath(PATH);
  back();
}

export async function updateCategory(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = readForm(formData);
  if (!id || !parsed.success) back(parsed.success ? "Missing id" : parsed.error.issues[0]?.message);

  const { name, description, sortOrder } = parsed.data;
  try {
    await prisma.category.update({
      where: { id },
      data: { name, slug: slugify(name), description: description || null, sortOrder },
    });
  } catch {
    back(`Could not update "${name}" - the name may already be taken`);
  }
  revalidatePath(PATH);
  back();
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) back("Missing id");

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    back("Cannot delete a category that still has prompts");
  }
  revalidatePath(PATH);
  back();
}
