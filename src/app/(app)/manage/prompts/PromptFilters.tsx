"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Chip, Input, Select } from "@/components/ui";

export type FilterOption = { slug: string; name: string; count: number };

const SEARCH_DEBOUNCE_MS = 350;

export function PromptFilters({
  categories,
  tags,
  total,
}: {
  categories: FilterOption[];
  tags: FilterOption[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const category = params.get("category") ?? "";
  const selectedTags = (params.get("tags") ?? "").split(",").filter(Boolean);
  const mode = params.get("mode") === "AND" ? "AND" : "OR";
  const status = params.get("status") ?? "all";
  const baseOnly = params.get("base") === "1";
  const query = params.get("q") ?? "";
  const view = params.get("view") === "cards" ? "cards" : "graph";

  const [searchDraft, setSearchDraft] = useState(query);

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    startTransition(() => router.push(next.size ? `?${next}` : "/manage/prompts"));
  }

  // Keep the input in sync when the URL changes from elsewhere (back button).
  useEffect(() => setSearchDraft(query), [query]);

  useEffect(() => {
    if (searchDraft === query) return;
    const timer = setTimeout(() => apply({ q: searchDraft || null }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  function toggleTag(slug: string) {
    const next = selectedTags.includes(slug)
      ? selectedTags.filter((item) => item !== slug)
      : [...selectedTags, slug];
    apply({ tags: next.join(",") || null });
  }

  const activeCount =
    (category ? 1 : 0) +
    selectedTags.length +
    (baseOnly ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (query ? 1 : 0);

  return (
    <Card className="mb-5">
      <div className="grid gap-4 p-4 md:grid-cols-[13rem_1fr]">
        <div className="space-y-4">
          <div>
            <p className="eyebrow mb-1.5">Category</p>
            <Select value={category} onChange={(event) => apply({ category: event.target.value })}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} ({item.count})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Search</p>
            <Input
              value={searchDraft}
              placeholder="Title or body..."
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center gap-3">
              <p className="eyebrow">Tags</p>
              {selectedTags.length > 1 && (
                <div className="flex gap-1">
                  {(["OR", "AND"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => apply({ mode: option === "OR" ? null : option })}
                      className={
                        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition " +
                        (mode === option
                          ? "bg-accent-dim/50 text-accent"
                          : "text-ink-dim hover:text-ink")
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {tags.length === 0 ? (
              <p className="font-mono text-[11px] text-ink-dim">No tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Chip
                    key={tag.slug}
                    active={selectedTags.includes(tag.slug)}
                    count={tag.count}
                    onClick={() => toggleTag(tag.slug)}
                  >
                    {tag.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="eyebrow mb-1.5">View</p>
              <div className="flex gap-1.5">
                {(["graph", "cards"] as const).map((option) => (
                  <Chip
                    key={option}
                    active={view === option}
                    onClick={() => apply({ view: option === "graph" ? null : option })}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-1.5">Status</p>
              <div className="flex gap-1.5">
                {(["all", "active", "inactive"] as const).map((option) => (
                  <Chip
                    key={option}
                    active={status === option}
                    onClick={() => apply({ status: option === "all" ? null : option })}
                  >
                    {option}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-1.5">Only</p>
              <Chip active={baseOnly} onClick={() => apply({ base: baseOnly ? null : "1" })}>
                Base fragments
              </Chip>
            </div>
            <span className="ml-auto font-mono text-[11px] text-ink-dim">
              {pending ? "..." : `${total} prompt${total === 1 ? "" : "s"}`}
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() =>
                      router.push(view === "cards" ? "/manage/prompts?view=cards" : "/manage/prompts"),
                    )
                  }
                  className="ml-3 text-accent hover:underline"
                >
                  clear {activeCount}
                </button>
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
