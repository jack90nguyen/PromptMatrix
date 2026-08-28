/**
 * Shapes the prompt library as a graph: categories and tags are real nodes,
 * prompts hang off their category and off every tag they carry.
 *
 * Two prompts from different categories sharing a tag therefore meet at that
 * tag node - which is the whole point of the view. Linking such prompts
 * directly instead would cost N(N-1)/2 edges per tag; via a tag node it is N.
 */

export type GraphNodeKind = "category" | "prompt" | "tag";

export type GraphNode = {
  /** Namespaced so the three kinds can never collide: `c:`, `p:`, `t:`. */
  id: string;
  kind: GraphNodeKind;
  label: string;
  radius: number;
  /** Owning category, for colouring. Null on tag nodes. */
  categoryId: string | null;
  /** What a click acts on: prompt id to open, or category / tag slug to filter. */
  refId: string;
  isBase: boolean;
  isActive: boolean;
  /** Prompts for a category / tag node; tags for a prompt node. */
  degree: number;
};

export type GraphLinkKind = "belongs" | "tagged";

export type GraphLink = {
  source: string;
  target: string;
  kind: GraphLinkKind;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
  /** Set when the prompt list was capped, so the UI can say so out loud. */
  truncated: { shown: number; total: number } | null;
  counts: { categories: number; prompts: number; tags: number };
};

export type GraphCategory = { id: string; name: string; slug: string };

export type GraphPrompt = {
  id: string;
  title: string;
  categoryId: string;
  isBase: boolean;
  isActive: boolean;
  tags: Array<{ slug: string; name: string }>;
};

/** SVG stays smooth to roughly this many nodes; past it, switch to canvas. */
export const MAX_PROMPT_NODES = 500;

/** Hues that hold up on the dark canvas, in assignment order. */
export const CATEGORY_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#4ade80",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#facc15",
] as const;

export function categoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]!;
}

export const TAG_COLOR = "#64748b";

function categoryRadius(promptCount: number): number {
  return Math.min(22, 9 + Math.sqrt(promptCount) * 2.4);
}

function promptRadius(tagCount: number): number {
  return Math.min(9, 4.5 + tagCount * 0.7);
}

function tagRadius(promptCount: number): number {
  return Math.min(14, 5 + Math.sqrt(promptCount) * 1.4);
}

/**
 * Categories with no prompt in the given set are left out: after filtering,
 * an isolated node carries no information and only adds noise.
 */
export function buildGraph(categories: GraphCategory[], prompts: GraphPrompt[]): GraphData {
  const shown = prompts.slice(0, MAX_PROMPT_NODES);
  const truncated =
    prompts.length > shown.length ? { shown: shown.length, total: prompts.length } : null;

  const promptsPerCategory = new Map<string, number>();
  const tagUse = new Map<string, { name: string; count: number }>();

  for (const prompt of shown) {
    promptsPerCategory.set(prompt.categoryId, (promptsPerCategory.get(prompt.categoryId) ?? 0) + 1);
    for (const tag of prompt.tags) {
      const existing = tagUse.get(tag.slug);
      if (existing) existing.count += 1;
      else tagUse.set(tag.slug, { name: tag.name, count: 1 });
    }
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const category of categories) {
    const count = promptsPerCategory.get(category.id) ?? 0;
    if (count === 0) continue;
    nodes.push({
      id: `c:${category.id}`,
      kind: "category",
      label: category.name,
      radius: categoryRadius(count),
      categoryId: category.id,
      refId: category.slug,
      isBase: false,
      isActive: true,
      degree: count,
    });
  }

  for (const [slug, tag] of tagUse) {
    nodes.push({
      id: `t:${slug}`,
      kind: "tag",
      label: tag.name,
      radius: tagRadius(tag.count),
      categoryId: null,
      refId: slug,
      isBase: false,
      isActive: true,
      degree: tag.count,
    });
  }

  const categoryNodeIds = new Set(nodes.filter((node) => node.kind === "category").map((n) => n.id));

  for (const prompt of shown) {
    const nodeId = `p:${prompt.id}`;
    nodes.push({
      id: nodeId,
      kind: "prompt",
      label: prompt.title,
      radius: promptRadius(prompt.tags.length),
      categoryId: prompt.categoryId,
      refId: prompt.id,
      isBase: prompt.isBase,
      isActive: prompt.isActive,
      degree: prompt.tags.length,
    });

    const categoryNodeId = `c:${prompt.categoryId}`;
    if (categoryNodeIds.has(categoryNodeId)) {
      links.push({ source: categoryNodeId, target: nodeId, kind: "belongs" });
    }
    for (const tag of prompt.tags) {
      links.push({ source: nodeId, target: `t:${tag.slug}`, kind: "tagged" });
    }
  }

  return {
    nodes,
    links,
    truncated,
    counts: {
      categories: categoryNodeIds.size,
      prompts: shown.length,
      tags: tagUse.size,
    },
  };
}
