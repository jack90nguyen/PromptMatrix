"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/current-user";
import { promptSchema } from "@/lib/schemas";

const PATH = "/manage/prompts";

export type PromptFormState = { error: string | null };

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
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
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
    return { error: "Could not save the prompt. Check the category and tags still exist." };
  }

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deletePrompt(formData: FormData): Promise<void> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.prompt.delete({ where: { id } });

  revalidatePath(PATH);
  redirect(PATH);
}
