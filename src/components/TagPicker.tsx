"use client";

import { useMemo, useState } from "react";
import { Chip, Input } from "@/components/ui";

export type PickableTag = { slug: string; name: string; count?: number };

/** Above this many tags the list gets a search box and its own scroll area. */
const SEARCH_THRESHOLD = 12;

/**
 * Selected tags are always listed first and always shown, even when the search
 * text does not match them - otherwise typing makes a chosen tag disappear and
 * there is no way to see what is still active.
 */
export function TagPicker({
  tags,
  selected,
  onToggle,
  onClear,
  emptyLabel = "No tags yet.",
  maxHeightClass = "max-h-60",
}: {
  tags: PickableTag[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear?: () => void;
  emptyLabel?: string;
  /** The filter bar sits above the content and must stay short; the composer
   *  panel is a tall side column and can afford more. */
  maxHeightClass?: string;
}) {
  const [query, setQuery] = useState("");
  const crowded = tags.length > SEARCH_THRESHOLD;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const isSelected = (tag: PickableTag) => selected.includes(tag.slug);
    const matches = (tag: PickableTag) =>
      isSelected(tag) || !needle || tag.name.toLowerCase().includes(needle);

    return [...tags]
      .filter(matches)
      .sort((a, b) => Number(isSelected(b)) - Number(isSelected(a)) || a.name.localeCompare(b.name));
  }, [tags, selected, query]);

  if (tags.length === 0) {
    return <p className="font-mono text-[11px] text-ink-dim">{emptyLabel}</p>;
  }

  const hidden = tags.length - visible.length;

  return (
    <div className="space-y-2">
      {crowded && (
        <Input
          value={query}
          placeholder={`Search ${tags.length} tags...`}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      <div className={crowded ? `${maxHeightClass} overflow-y-auto pr-1` : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {visible.map((tag) => (
            <Chip
              key={tag.slug}
              active={selected.includes(tag.slug)}
              count={tag.count}
              onClick={() => onToggle(tag.slug)}
            >
              {tag.name}
            </Chip>
          ))}
        </div>
      </div>

      {(hidden > 0 || (selected.length > 0 && onClear)) && (
        <div className="flex items-center gap-3 font-mono text-[11px] text-ink-dim">
          {hidden > 0 && <span>{hidden} hidden by search</span>}
          {selected.length > 0 && onClear && (
            <button type="button" onClick={onClear} className="ml-auto text-accent hover:underline">
              clear {selected.length}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
