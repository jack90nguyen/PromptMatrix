"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { tagSchema } from "@/lib/schemas";
import { slugify } from "@/lib/slug";

const PATH = "/manage/tags";

function back(error?: string): never {
  redirect(error ? `${PATH}?error=${encodeURIComponent(error)}` : PATH);
}

export async function createTag(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = tagSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) back(parsed.error.issues[0]?.message);

  const { name } = parsed.data;
  try {
    await prisma.tag.create({ data: { name, slug: slugify(name) } });
  } catch {
    back(`Tag "${name}" already exists`);
  }
  revalidatePath(PATH);
  back();
}

export async function updateTag(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const parsed = tagSchema.safeParse({ name: formData.get("name") });
  if (!id || !parsed.success) back(parsed.success ? "Missing id" : parsed.error.issues[0]?.message);

  const { name } = parsed.data;
  try {
    await prisma.tag.update({ where: { id }, data: { name, slug: slugify(name) } });
  } catch {
    back(`Could not rename to "${name}" - it may already be taken`);
  }
  revalidatePath(PATH);
  back();
}

export async function deleteTag(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) back("Missing id");

  await prisma.tag.delete({ where: { id } });
  revalidatePath(PATH);
  back();
}
