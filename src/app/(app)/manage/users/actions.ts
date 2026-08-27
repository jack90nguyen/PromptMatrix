"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { hashPassword } from "@/lib/password";
import { userCreateSchema, userUpdateSchema } from "@/lib/schemas";

const PATH = "/manage/users";

function back(error?: string): never {
  redirect(error ? `${PATH}?error=${encodeURIComponent(error)}` : PATH);
}

export async function createUser(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = userCreateSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) back(parsed.error.issues[0]?.message);

  const { username, name, password, role } = parsed.data;
  try {
    await prisma.user.create({
      data: { username, name, role, passwordHash: await hashPassword(password) },
    });
  } catch {
    back(`Username "${username}" is already taken`);
  }
  revalidatePath(PATH);
  back();
}

export async function updateUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) back("Missing id");

  const parsed = userUpdateSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    isActive: formData.get("isActive"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) back(parsed.error.issues[0]?.message);

  const { name, role, isActive, password } = parsed.data;

  // Guard against locking yourself out of user management.
  if (id === admin.id && (!isActive || role !== "ADMIN")) {
    back("You cannot remove your own admin access");
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      isActive,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  revalidatePath(PATH);
  back();
}
