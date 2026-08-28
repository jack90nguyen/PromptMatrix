import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashKey } from "@/lib/api-key";
import {
  composePrompt,
  selectFragments,
  type Fragment,
  type TagMatchMode,
} from "@/lib/compose";

/** What a successful JSON response looks like. */
export type ComposeResponse = {
  category: { slug: string; name: string };
  mode: TagMatchMode;
  tags: string[];
  fragmentCount: number;
  fragments: Array<{
    id: string;
    title: string;
    sortOrder: number;
    isBase: boolean;
    tags: string[];
  }>;
  prompt: string;
};

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

/** Query string first, since that is how most no-code callers pass it. */
function readKey(request: NextRequest): string | null {
  const fromQuery = request.nextUrl.searchParams.get("key");
  if (fromQuery) return fromQuery;

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();

  return null;
}

export async function GET(request: NextRequest) {
  const presented = readKey(request);
  if (!presented) return fail(401, "Missing API key");

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash: hashKey(presented), isActive: true },
    select: { id: true },
  });
  if (!apiKey) return fail(401, "Invalid or revoked API key");

  const params = request.nextUrl.searchParams;
  const categorySlug = params.get("category")?.trim();
  if (!categorySlug) return fail(400, "category is required");

  const modeParam = (params.get("mode") ?? "OR").toUpperCase();
  if (modeParam !== "OR" && modeParam !== "AND") {
    return fail(400, "mode must be OR or AND");
  }
  const mode: TagMatchMode = modeParam;

  const format = (params.get("format") ?? "json").toLowerCase();
  if (format !== "json" && format !== "text") {
    return fail(400, "format must be json or text");
  }

  const tagSlugs = (params.get("tags") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: {
      slug: true,
      name: true,
      prompts: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          body: true,
          sortOrder: true,
          isBase: true,
          tags: { select: { slug: true } },
        },
      },
    },
  });
  if (!category) return fail(404, "Category not found");

  const fragments: Fragment[] = category.prompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
    body: prompt.body,
    sortOrder: prompt.sortOrder,
    isBase: prompt.isBase,
    tagSlugs: prompt.tags.map((tag) => tag.slug),
  }));

  const selected = selectFragments(fragments, tagSlugs, mode);
  const prompt = composePrompt(selected);

  // Best effort: a failed bookkeeping write must not fail the request.
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  if (format === "text") {
    return new NextResponse(prompt, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const body: ComposeResponse = {
    category: { slug: category.slug, name: category.name },
    mode,
    tags: tagSlugs,
    fragmentCount: selected.length,
    fragments: selected.map((fragment) => ({
      id: fragment.id,
      title: fragment.title,
      sortOrder: fragment.sortOrder,
      isBase: fragment.isBase,
      tags: fragment.tagSlugs,
    })),
    prompt,
  };
  return NextResponse.json(body);
}
