export type TagMatchMode = "OR" | "AND";

/** A prompt fragment, flattened for composition. Pure data, no Prisma types. */
export type Fragment = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  isBase: boolean;
  tagSlugs: string[];
};

export const FRAGMENT_SEPARATOR = "\n\n";

function byOrderThenTitle(a: Fragment, b: Fragment): number {
  return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
}

/**
 * Pick the fragments that make up a composed prompt.
 *
 * - `isBase` fragments are always included.
 * - With no tags selected, only base fragments are included.
 * - OR: fragment shares at least one selected tag.
 * - AND: fragment carries every selected tag.
 */
export function selectFragments(
  fragments: Fragment[],
  selectedTagSlugs: string[],
  mode: TagMatchMode,
): Fragment[] {
  const selected = new Set(selectedTagSlugs);

  const matched = fragments.filter((fragment) => {
    if (fragment.isBase) return true;
    if (selected.size === 0) return false;

    return mode === "AND"
      ? selectedTagSlugs.every((slug) => fragment.tagSlugs.includes(slug))
      : fragment.tagSlugs.some((slug) => selected.has(slug));
  });

  return matched.sort(byOrderThenTitle);
}

export type ComposeOptions = {
  /** Prefix each fragment with `## <title>`. On unless asked otherwise. */
  withTitles?: boolean;
};

/**
 * Join fragments into the final prompt. Titles are markdown H2 headings, which
 * gives a model a visible boundary between fragments instead of one wall of
 * text where several instructions run together.
 */
export function composePrompt(
  fragments: Fragment[],
  { withTitles = true }: ComposeOptions = {},
): string {
  return fragments
    .map((fragment) => {
      const body = fragment.body.trim();
      if (!body) return "";
      return withTitles ? `## ${fragment.title.trim()}\n${body}` : body;
    })
    .filter((part) => part.length > 0)
    .join(FRAGMENT_SEPARATOR);
}

export type CategoryTag = {
  slug: string;
  name: string;
  /** How many fragments in this category carry the tag. */
  count: number;
};

/** Everything the composer needs for one category. */
export type CategoryPayload = {
  fragments: Fragment[];
  tags: CategoryTag[];
};

/** Tags actually present on the given fragments, sorted by name. */
export function collectTags(
  fragments: Array<Fragment & { tagNames: Record<string, string> }>,
): CategoryTag[] {
  const counts = new Map<string, CategoryTag>();

  for (const fragment of fragments) {
    for (const slug of fragment.tagSlugs) {
      const existing = counts.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(slug, { slug, name: fragment.tagNames[slug] ?? slug, count: 1 });
      }
    }
  }

  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}
