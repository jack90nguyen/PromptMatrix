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
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-36 bg-surface px-3 py-2 text-left">
              <span className="eyebrow">Category</span>
            </th>
            {data.columns.map((column) => (
              <th key={column.slug} className="w-11 px-1.5 py-2 text-center align-bottom">
                <span
                  className={
                    "block truncate font-mono text-[10px] uppercase tracking-wider " +
                    (column.slug === BASE_COLUMN
                      ? "text-amber-400"
                      : activeTagSlugs.includes(column.slug)
                        ? "text-accent"
                        : "text-ink-dim")
                  }
                  title={`${column.name} (${column.total})`}
                >
                  {column.name}
                </span>
              </th>
            ))}
            <th className="px-2 py-2 text-right">
              <span className="eyebrow">All</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => {
            const isActiveRow = row.category.id === activeCategoryId;
            return (
              <tr key={row.category.id}>
                <td
                  className={
                    "sticky left-0 z-10 min-w-36 max-w-56 truncate border-t border-line bg-surface px-3 py-1.5 font-mono text-[11px] " +
                    (isActiveRow ? "text-accent" : "text-ink")
                  }
                  title={row.category.name}
                >
                  {isActiveRow && <span className="mr-1 text-accent">&#9656;</span>}
                  {row.category.name}
                </td>

                {data.columns.map((column) => {
                  const count = row.counts[column.slug] ?? 0;
                  const selected =
                    isActiveRow &&
                    (column.slug === BASE_COLUMN
                      ? activeTagSlugs.length === 0
                      : activeTagSlugs.includes(column.slug));

                  return (
                    <td key={column.slug} className="w-11 border-t border-line px-0.5 py-1.5 text-center">
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => onPick(row.category.id, column.slug)}
                        title={`${row.category.name} / ${column.name}: ${count}`}
                        className={
                          "h-6 w-10 rounded font-mono text-[11px] transition " +
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
                  {row.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
