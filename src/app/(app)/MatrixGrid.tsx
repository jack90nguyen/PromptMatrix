"use client";

import { BASE_COLUMN, type MatrixData } from "@/lib/matrix";

/** Cell shading step: 4 buckets from faint to full accent. */
function intensity(count: number, max: number): string {
  if (count === 0) return "text-ink-dim/30";
  if (max <= 1) return "bg-accent-dim/60 text-accent";
  const ratio = count / max;
  if (ratio > 0.66) return "bg-accent-dim/70 text-accent";
  if (ratio > 0.33) return "bg-accent-dim/45 text-accent/90";
  return "bg-accent-dim/25 text-accent/70";
}

/**
 * Tags run down the side and categories across the top, because a library
 * always ends up with far more tags than categories - 30 against 4 here - and
 * tag names are long. With tags as columns their labels forced every column
 * wide enough to read, and only a handful fitted on screen.
 */
export function MatrixGrid({
  data,
  activeCategoryId,
  activeTagSlugs,
  onPick,
}: {
  data: MatrixData;
  activeCategoryId: string;
  activeTagSlugs: string[];
  onPick: (categoryId: string, columnSlug: string) => void;
}) {
  if (data.columns.length === 0) {
    return (
      <p className="px-4 py-8 text-center font-mono text-xs text-ink-dim">
        No tagged or base fragments yet - the matrix fills in as you add prompts.
      </p>
    );
  }

  return (
    <div className="max-h-[26rem] overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 min-w-52 bg-surface px-3 py-2 text-left">
              <span className="eyebrow">Tag</span>
            </th>
            {data.rows.map((row) => (
              <th
                key={row.category.id}
                className="sticky top-0 z-20 w-20 bg-surface px-1.5 py-2 text-center align-bottom"
              >
                <span
                  className={
                    "block truncate font-mono text-[10px] uppercase tracking-wider " +
                    (row.category.id === activeCategoryId ? "text-accent" : "text-ink-dim")
                  }
                  title={`${row.category.name} (${row.total})`}
                >
                  {row.category.name}
                </span>
              </th>
            ))}
            <th className="sticky top-0 z-20 bg-surface px-2 py-2 text-right">
              <span className="eyebrow">All</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.columns.map((column) => {
            const isBaseRow = column.slug === BASE_COLUMN;
            const isActiveRow = isBaseRow
              ? activeTagSlugs.length === 0
              : activeTagSlugs.includes(column.slug);

            return (
              <tr key={column.slug}>
                <td
                  className={
                    "sticky left-0 z-10 min-w-52 max-w-80 truncate border-t border-line bg-surface px-3 py-1.5 font-mono text-[11px] " +
                    (isBaseRow ? "text-amber-400" : isActiveRow ? "text-accent" : "text-ink")
                  }
                  title={column.name}
                >
                  {isActiveRow && <span className="mr-1 text-accent">&#9656;</span>}
                  {column.name}
                </td>

                {data.rows.map((row) => {
                  const count = row.counts[column.slug] ?? 0;
                  const selected = row.category.id === activeCategoryId && isActiveRow;

                  return (
                    <td
                      key={row.category.id}
                      className="w-20 border-t border-line px-1.5 py-1.5 text-center"
                    >
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => onPick(row.category.id, column.slug)}
                        title={`${row.category.name} / ${column.name}: ${count}`}
                        className={
                          "h-6 w-12 rounded font-mono text-[11px] transition " +
                          (count === 0
                            ? "cursor-default text-ink-dim/25"
                            : "hover:ring-1 hover:ring-accent/60 cursor-pointer ") +
                          (count > 0 ? intensity(count, data.max) : "") +
                          (selected ? " ring-1 ring-accent" : "")
                        }
                      >
                        {count === 0 ? "·" : count}
                      </button>
                    </td>
                  );
                })}

                <td className="border-t border-line px-2 py-1.5 text-right font-mono text-[11px] text-ink-dim">
                  {column.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
