import { z } from "zod";

const checkbox = z.preprocess((value) => value === "on", z.boolean());
const trimmed = z.string().trim();

export const loginSchema = z.object({
  username: trimmed.min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const categorySchema = z.object({
  name: trimmed.min(1, "Name is required").max(80),
  description: trimmed.max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const tagSchema = z.object({
  name: trimmed.min(1, "Name is required").max(60),
});
export type TagInput = z.infer<typeof tagSchema>;

export const promptSchema = z.object({
  title: trimmed.min(1, "Title is required").max(160),
  body: z.string().trim().min(1, "Body is required"),
  categoryId: trimmed.min(1, "Category is required"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isBase: checkbox,
  isActive: checkbox,
  tagIds: z.array(z.string().min(1)).default([]),
});
export type PromptInput = z.infer<typeof promptSchema>;

export const roleSchema = z.enum(["ADMIN", "EDITOR"]);

export const userCreateSchema = z.object({
  username: trimmed
    .min(3, "Username must be at least 3 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, digits, dot, dash and underscore"),
  name: trimmed.min(1, "Name is required").max(80),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema,
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: trimmed.min(1, "Name is required").max(80),
  role: roleSchema,
  isActive: checkbox,
  /** Empty means "keep current password". */
  password: z.union([z.string().min(8, "Password must be at least 8 characters"), z.literal("")]),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const apiKeySchema = z.object({
  name: trimmed.min(1, "Name is required").max(60),
});
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
