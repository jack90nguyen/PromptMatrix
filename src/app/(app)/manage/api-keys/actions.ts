"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { generateKey } from "@/lib/api-key";
import { apiKeySchema } from "@/lib/schemas";

const PATH = "/manage/api-keys";

function back(params?: { error?: string; created?: string }): never {
  const search = new URLSearchParams();
  if (params?.error) search.set("error", params.error);
  if (params?.created) search.set("created", params.created);
  redirect(search.size > 0 ? `${PATH}?${search}` : PATH);
}

/**
 * The generated key travels back through the URL because it is shown exactly
 * once and never persisted in readable form.
 */
export async function createApiKey(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const parsed = apiKeySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message });

  const generated = generateKey();
  await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      prefix: generated.prefix,
      keyHash: generated.keyHash,
      createdById: admin.id,
    },
  });

  revalidatePath(PATH);
  back({ created: generated.key });
}

export async function revokeApiKey(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) back({ error: "Missing id" });

  await prisma.apiKey.delete({ where: { id } });
  revalidatePath(PATH);
  back();
}
