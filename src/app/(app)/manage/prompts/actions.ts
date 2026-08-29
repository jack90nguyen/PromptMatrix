"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { promptSchema } from "@/lib/schemas";
import type { PromptDefaults } from "./PromptForm";

const PATH = "/manage/prompts";

export type PromptFormState = {
  error: string | null;
  /** Flips once the row is written; the caller decides where to go next. */
  saved: boolean;
};

/** Everything the edit dialog needs for one prompt. */
export type PromptEditData = {
  defaults: PromptDefaults;
  updatedByName: string | null;
  updatedAt: string;
};

export async function savePrompt(
  _prev: PromptFormState,
  formData: FormData,
): Promise<PromptFormState> {
  const user = await requireUser();

  const parsed = promptSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    categoryId: formData.get("categoryId"),
    sortOrder: formData.get("sortOrder") ?? 0,
    isBase: formData.get("isBase"),
    isActive: formData.get("isActive"),
    tagIds: formData.getAll("tagIds").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input", saved: false };
  }

  const { tagIds, ...fields } = parsed.data;
  const id = String(formData.get("id") ?? "");

  try {
    if (id) {
      await prisma.prompt.update({
        where: { id },
        data: {
          ...fields,
          updatedById: user.id,
          tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
        },
      });
    } else {
      await prisma.prompt.create({
        data: {
          ...fields,
          updatedById: user.id,
          tags: { connect: tagIds.map((tagId) => ({ id: tagId })) },
        },
      });
    }
  } catch {
    return {
      error: "Could not save the prompt. Check the category and tags still exist.",
      saved: false,
    };
  }

  revalidatePath(PATH);
  // No redirect: a page wants to navigate away, a dialog wants to stay put.
  return { error: null, saved: true };
}

export async function loadPrompt(id: string): Promise<PromptEditData | null> {
  await requireUser();

  const prompt = await prisma.prompt.findUnique({
    where: { id },
    include: { tags: { select: { id: true } }, updatedBy: { select: { name: true } } },
  });
  if (!prompt) return null;

  return {
    defaults: {
      id: prompt.id,
      title: prompt.title,
      body: prompt.body,
      categoryId: prompt.categoryId,
      sortOrder: prompt.sortOrder,
      isBase: prompt.isBase,
      isActive: prompt.isActive,
      tagIds: prompt.tags.map((tag) => tag.id),
    },
    updatedByName: prompt.updatedBy?.name ?? null,
    updatedAt: prompt.updatedAt.toISOString().slice(0, 10),
  };
}

/**
 * Same delete, minus the redirect. The edit dialog closes itself and refreshes
 * in place; `deletePrompt` above still redirects, which is what the standalone
 * edit page needs.
 */
export async function removePrompt(id: string): Promise<void> {
  await requireUser();
  if (id) await prisma.prompt.delete({ where: { id } });
  revalidatePath(PATH);
}

export async function deletePrompt(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.prompt.delete({ where: { id } });

  revalidatePath(PATH);
  redirect(PATH);
}
