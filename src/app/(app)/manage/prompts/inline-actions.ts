"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { categorySchema, tagSchema } from "@/lib/schemas";
import { slugify } from "@/lib/slug";

export type InlineOption = { id: string; name: string };

export type InlineResult =
  | { ok: true; item: InlineOption }
  | { ok: false; error: string };

/**
 * Create a category without leaving the prompt form. The row is persisted
 * immediately, so an abandoned prompt can leave an empty category behind -
 * harmless, and deletable from the Categories screen.
 */
export async function createCategoryInline(name: string): Promise<InlineResult> {
  await requireUser();

  const parsed = categorySchema.safeParse({ name, description: "", sortOrder: 0 });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const slug = slugify(parsed.data.name);
  if (!slug) return { ok: false, error: "Name must contain letters or digits" };

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: parsed.data.name }, { slug }] },
    select: { id: true, name: true },
  });
  if (existing) return { ok: false, error: `"${existing.name}" already exists` };

  const category = await prisma.category.create({
    data: { name: parsed.data.name, slug },
    select: { id: true, name: true },
  });
  return { ok: true, item: category };
}

export async function createTagInline(name: string): Promise<InlineResult> {
  await requireUser();

  const parsed = tagSchema.safeParse({ name });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  const slug = slugify(parsed.data.name);
  if (!slug) return { ok: false, error: "Name must contain letters or digits" };

  const existing = await prisma.tag.findFirst({
    where: { OR: [{ name: parsed.data.name }, { slug }] },
    select: { id: true, name: true },
  });
  if (existing) return { ok: false, error: `"${existing.name}" already exists` };

  const tag = await prisma.tag.create({
    data: { name: parsed.data.name, slug },
    select: { id: true, name: true },
  });
  return { ok: true, item: tag };
}
