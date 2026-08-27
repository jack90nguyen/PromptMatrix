"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/schemas";
import { startSession } from "@/lib/session";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true, passwordHash: true, role: true, isActive: true },
  });

  // Same message for unknown user / wrong password / disabled account.
  const invalid = { error: "Invalid username or password" };
  if (!user || !user.isActive) return invalid;
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid;

  await startSession({ uid: user.id, role: user.role });
  redirect("/");
}
