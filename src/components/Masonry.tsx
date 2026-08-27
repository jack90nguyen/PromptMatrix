"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const EPSILON = 0.5;

/** Round-robin fallback used before the first measurement lands. */
function roundRobin(count: number, columns: number): number[][] {
  const result: number[][] = Array.from({ length: columns }, () => []);
  for (let index = 0; index < count; index += 1) {
    result[index % columns]!.push(index);
  }
  return result;
}

/** Greedy shortest-column packing: keeps reading order roughly row-major. */
function pack(heights: number[], columns: number, gap: number): number[][] {
  const result: number[][] = Array.from({ length: columns }, () => []);
  const totals = new Array<number>(columns).fill(0);

  heights.forEach((height, index) => {
    let target = 0;
    for (let column = 1; column < columns; column += 1) {
      // Strict "shorter than" keeps the leftmost column on ties.
      if (totals[column]! < totals[target]! - EPSILON) target = column;
    }
    result[target]!.push(index);
    totals[target] = totals[target]! + height + gap;
  });

  return result;
}

function sameHeights(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]!) < EPSILON);
}

/**
 * Masonry that measures real card heights, rather than CSS `columns` which
 * fills column-by-column and scrambles reading order.
 */
export function Masonry({
  children,
  minColumnWidth = 260,
  maxColumns = 4,
  gap = 16,
}: {
  children: ReactNode[];
  minColumnWidth?: number;
  maxColumns?: number;
  gap?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const measured = useRef<number[]>([]);
  const [columnCount, setColumnCount] = useState(1);
  const [layout, setLayout] = useState<number[][] | null>(null);

  const recomputeColumns = useCallback(() => {
    const width = containerRef.current?.clientWidth ?? 0;
    if (width === 0) return;
    const fits = Math.floor((width + gap) / (minColumnWidth + gap));
    const next = Math.max(1, Math.min(maxColumns, fits));
    setColumnCount((current) => {
      if (current === next) return current;
      measured.current = [];
      setLayout(null);
      return next;
    });
  }, [gap, maxColumns, minColumnWidth]);

  useEffect(() => {
    recomputeColumns();
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(recomputeColumns);
    observer.observe(element);
    return () => observer.disconnect();
  }, [recomputeColumns]);

  useLayoutEffect(() => {
    const heights = children.map(
      (_, index) => itemRefs.current[index]?.getBoundingClientRect().height ?? 0,
    );
    if (heights.length === 0 || heights.some((height) => height === 0)) return;
    if (sameHeights(heights, measured.current)) return;

    measured.current = heights;
    setLayout(pack(heights, columnCount, gap));
  }, [children, columnCount, gap, layout]);

  const columns = layout?.length === columnCount ? layout : roundRobin(children.length, columnCount);

  return (
    <div ref={containerRef} className="flex items-start" style={{ gap }}>
      {columns.map((indices, column) => (
        <div key={column} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
          {indices.map((index) => (
            <div
              key={index}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
            >
              {children[index]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
