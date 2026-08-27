/** Column key for the pseudo-column holding a category's base fragments. */
export const BASE_COLUMN = "__base__";

export type MatrixCategory = { id: string; name: string; slug: string };
export type MatrixTag = { slug: string; name: string };

export type MatrixPrompt = {
  categoryId: string;
  isBase: boolean;
  tagSlugs: string[];
};

export type MatrixColumn = {
  slug: string;
  name: string;
  total: number;
};

export type MatrixRow = {
  category: MatrixCategory;
  /** Count per column slug, including BASE_COLUMN. */
  counts: Record<string, number>;
  total: number;
};

export type MatrixData = {
  columns: MatrixColumn[];
  rows: MatrixRow[];
  max: number;
};

/**
 * Aggregate prompts into a category x tag grid.
 *
 * Tags that no prompt uses are dropped, so the grid stays as narrow as the data
 * allows. A prompt carrying two tags counts once in each of their columns.
 *
 * TODO: this walks every active prompt. Past ~10k prompts, move the counting
 * into SQL with a groupBy over the join table.
 */
export function buildMatrix(
  categories: MatrixCategory[],
  tags: MatrixTag[],
  prompts: MatrixPrompt[],
): MatrixData {
  const tagTotals = new Map<string, number>();
  const rowsById = new Map<string, MatrixRow>();

  for (const category of categories) {
    rowsById.set(category.id, { category, counts: {}, total: 0 });
  }

  let baseTotal = 0;

  for (const prompt of prompts) {
    const row = rowsById.get(prompt.categoryId);
    if (!row) continue;

    row.total += 1;

    if (prompt.isBase) {
      row.counts[BASE_COLUMN] = (row.counts[BASE_COLUMN] ?? 0) + 1;
      baseTotal += 1;
    }

    for (const slug of prompt.tagSlugs) {
      row.counts[slug] = (row.counts[slug] ?? 0) + 1;
      tagTotals.set(slug, (tagTotals.get(slug) ?? 0) + 1);
    }
  }

  const nameBySlug = new Map(tags.map((tag) => [tag.slug, tag.name]));

  const tagColumns: MatrixColumn[] = [...tagTotals.entries()]
    .map(([slug, total]) => ({ slug, name: nameBySlug.get(slug) ?? slug, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const columns: MatrixColumn[] =
    baseTotal > 0
      ? [...tagColumns, { slug: BASE_COLUMN, name: "Base", total: baseTotal }]
      : tagColumns;

  const rows = [...rowsById.values()];
  const max = Math.max(0, ...rows.flatMap((row) => Object.values(row.counts)));

  return { columns, rows, max };
}
